# latk.js — Bug Report

**Date:** 2026-08-06
**Reviewed:** `build/latk-*.js` (source of truth), `latk.js` / `latk.min.js` (bundle), `tools/latk-decoder.js`, `examples/*.html`, `build/build.command`, `package.json`
**Bundle status:** `latk.js` is byte-identical to a fresh concatenation of the `build/` sources, so every finding below applies to the shipped artifact.

## Verdict

The data model (`LatkPoint` / `LatkStroke` / `LatkFrame` / `LatkLayer`) and the three binary/zip readers are sound and work on real files. The rest of the library is not: **most of `Latk`'s public methods are Python that was mechanically transliterated into JavaScript syntax without being run**. They reference Python builtins (`len`, `str`, `sqrt`), Python list methods (`.remove`, `.insert`), and Python string methods (`"\n".join(list)`), and they assign to undeclared variables inside a file that declares `"use strict"`. Fifteen of the ~25 public methods throw a `ReferenceError` or `TypeError` on the first call with valid input.

Concretely, of the `Latk` API:

| Works | Throws immediately |
|---|---|
| `read`, `readTiltBrush`, `readQuill`, `readJson`¹ | `clean`, `filter`, `normalize`, `refine` |
| `jsonToGp`¹ (with wrong output — §B) | `splitStroke`, `reduceStroke` |
| `setCoords`, `getLastLayer`, `remap`, `remapInt` | `setStroke`, `setPoints` |
| `smoothStroke` (skips one point — B22) | `getDistance`, `hitDetect3D` |
| `getFileNameNoExt`, `getExtFromFileName` | `roundVal`, `roundValInt` |
| — | `getLongestLayer`, `getLoopFrame`, `write`, `download`² |

¹ only when a global variable literally named `latk` exists — see B14.
² the fallback branch only.

The single highest-value fix is not any individual bug: it is **adding ESLint with `no-undef` and a smoke test**. `no-undef` alone flags `rdp`, `len`, `str`, `sqrt`, `coords`, `pressures`, `strengths`, `totalLength`, `p1`, `p2`, `pressure`, `strength`, `coord`, `x`, `y`, `z`, `globalScale`, `globalOffset`, `yUp`, `useScaleAndOffset`, `latk`, `uri`, and `i` — i.e. essentially all of §A.

### How these were verified

Findings are not from reading alone. The `build/` sources (minus JSZip) were loaded into a Node `vm` context and every public method was invoked with a valid 6-point `Latk`; separately, the shipped `latk.js` was loaded under a browser-ish shim and used to parse the three real sample files in `examples/files/`. Observed errors and values are quoted inline as *Observed:*.

Line references are to `build/latk-main.js` unless stated. For the bundle, add 425 (`latk-main.js:461` → `latk.js:886`).

---

## Severity summary

| # | Severity | Issue |
|---|---|---|
| A1–A13 | **Critical** | 15 public methods throw on first call (Python-isms, undeclared vars in strict mode, missing `rdp`) |
| A12 | **Critical** | `write()` — the entire export path — is non-functional in at least six independent ways |
| B14–B15 | **Critical** | `jsonToGp` reads config off an undeclared global named `latk`; scale/offset path throws |
| B16–B17 | **High** | Alpha silently becomes `undefined`; `vertex_color` is always discarded |
| C24–C26 | **High** | `ready` is `true` before Tilt/Quill data loads; all load errors are swallowed |
| D31 | **High** | The npm package cannot be `require`d and exports nothing |
| B18–B23 | **Medium** | `frame_number` lost, colour ranges inconsistent, `yUp` inverted read vs. write, `smoothStroke` off-by-one |
| C27–C30 | **Medium** | Fragile format sniffing, stub/dead API surface |
| D32–D38 | **Medium** | Vendored 2016 JSZip under imposed strict mode, no tests, no lint, duplicated source, `.npmignore` typo |
| E39–E41 | **Low** | Examples break on multi-layer files; depend on a magic variable name |

---

## A. Methods that throw on first call

> Context for this whole section: `build/latk-header.js:26` places `"use strict"` at the top of the concatenated bundle. Every assignment to an undeclared variable below is therefore a hard `ReferenceError`, not a silent global.

### A1. `clean()` — `rdp` does not exist, plus three undeclared variables
`latk-main.js:448-470`

```js
coords = [];        // :453  — no `let`
pressures = [];     // :454
strengths = [];     // :455
...
stroke.setCoords(rdp(coords, epsilon=epsilon));   // :461
```

`rdp` is never defined anywhere in the repository — `grep -rn "rdp"` returns exactly three call sites (`latk-main.js:461`, `latk.js:886`, `tools/latk-decoder.js:324`) and zero definitions. The Ramer–Douglas–Peucker implementation the architecture doc describes was never ported. The undeclared `coords` throws first.

`epsilon=epsilon` is a Python keyword argument; in JS it is an assignment expression that happens to evaluate to `epsilon`, so it is harmless but misleading.

*Observed:* `ReferenceError: coords is not defined`

**Fix:** implement or vendor RDP; declare the three arrays with `let`.

### A2. `filter()` — undeclared variables, `Array.remove`, wrong removal target, mutation during iteration
`latk-main.js:472-515`

```js
totalLength = 0.0;              // :485 — no `let`
p1 = stroke.points[i];          // :487
p2 = stroke.points[i-1];        // :488
...
frame.strokes.remove(stroke);   // :482, :501, :507 — Array has no .remove()
stroke.points.remove(stroke);   // :492 — removes the *stroke* from the *points* array
```

Four separate defects. Beyond the undeclared variables and the non-existent `Array.prototype.remove`, line 492 passes the wrong object entirely — the duplicate-point branch tries to remove `stroke` from `stroke.points`. And all four removals mutate `frame.strokes` / `stroke.points` while a `for...of` is iterating that same array, which skips elements.

*Observed:* `ReferenceError: totalLength is not defined`

**Fix:** rebuild with `Array.prototype.filter` into a new array rather than removing in place.

### A3. `normalize()` — `len()`, undeclared variables, lexicographic sort, comma operator
`latk-main.js:517-575`

```js
allX.sort();                                        // :538-540
let mostValArray = [ allX[len(allX)-1], ... ];      // :543 — Python len()
coord = point.co;                                   // :566 — no `let`
x = this.remap(...);                                // :567-569
point.co = (x,y,z);                                 // :570 — comma operator
```

Four independent bugs:
- `len()` is Python (`:543`, `:551-553`, `:567-569`).
- `coord`, `x`, `y`, `z` are undeclared (`:566-569`).
- `Array.prototype.sort()` with no comparator sorts **lexicographically by string**. *Observed:* `[10, 9, 100, 1].sort()` → `[1, 10, 100, 9]`. So `allX[0]` and `allX[len-1]` are not the min and max, and the entire normalisation range is wrong.
- `point.co = (x,y,z)` is the comma operator, not a tuple. It assigns the scalar `z`. Every point's `co` would become a number instead of a 3-element array, breaking every downstream consumer.

*Observed:* `ReferenceError: len is not defined`

**Fix:** `sort((a,b) => a-b)` (or just track min/max in the first pass — the sort is unnecessary), `.length`, declare the locals, and `point.co = [x, y, z]`.

### A4. `splitStroke()` — undeclared variables, `Array.insert`, wrong loop step
`latk-main.js:598-615`

```js
pressure = (points[i-1].pressure + points[i].pressure) / 2;   // :609 — no `let`
strength = (...);                                             // :610
stroke.points.insert(i, pt);                                  // :613 — Array has no .insert()
```

`Array.prototype.insert` is Python; the JS equivalent is `splice(i, 0, pt)`. Separately, the loop `for (let i=1; i<points.length; i+=2)` inserts into the array it is iterating, so after the first insertion `i += 2` no longer lands on the next original point — the step needs to account for the element just inserted.

*Observed:* `ReferenceError: pressure is not defined`

### A5. `reduceStroke()` — `Array.remove`, and removal by ascending index
`latk-main.js:617-621`

```js
for (let i=0; i<stroke.points.length; i += 2) {
    stroke.points.remove(stroke.points[i]);
}
```

Two bugs: no `Array.prototype.remove`, and removing by ascending index while the array shrinks skips elements. Also, `remove(value)` on a list of object references would remove the *first* matching reference, not index `i`.

*Observed:* `TypeError: stroke.points.remove is not a function`

**Fix:** `stroke.points = stroke.points.filter((_, i) => i % 2 === 1)`.

### A6. `getDistance()` / `hitDetect3D()` — bare `sqrt`
`latk-main.js:683-694`

```js
return sqrt((v1[0] - v2[0])**2 + ...);   // :684
```

`sqrt` is unqualified — should be `Math.sqrt`. (`**` is valid JS, so only the `sqrt` is wrong.) This takes `hitDetect3D()` down with it, and `hitDetect3D` is called from `filter()`.

*Observed:* `ReferenceError: sqrt is not defined`

### A7. `roundVal()` / `roundValInt()` — Python format strings
`latk-main.js:696-704`

```js
let formatter = "{0:." + str(b) + "f}";
return formatter.format(a);
```

`str()` doesn't exist, and `String.prototype.format` doesn't exist. Both methods are pure Python.

*Observed:* `ReferenceError: str is not defined`

**Fix:** `Number(a).toFixed(b)` / `Math.round(a)`.

### A8. `getLongestLayer()` — returns an out-of-scope variable, and the logic is wrong anyway
`latk-main.js:725-731`

```js
let index = 0;
for (let i=0; i<this.layers.length; i++) {
    if (this.layers[i].frames.length > index) index = i;
}
return this.layers[i];    // :730 — `i` is scoped to the loop
```

`i` is a `let` binding scoped to the `for` statement, so `this.layers[i]` is a `ReferenceError`. The loop body is also wrong independently: it compares a **frame count** against an **index** and then stores the index, so `index` never tracks the maximum. It should track the best count and the best index separately.

*Observed:* `ReferenceError: i is not defined`

### A9. `getLoopFrame(_frame)` — throws, ignores its argument, returns a non-index
`latk-main.js:721-723`

Calls `getLongestLayer()` twice, so it inherits A8. Beyond that it ignores its `_frame` parameter entirely and returns `loopCounter * (frames.length - 1)`, which is not a frame index under any interpretation.

### A10. `setStroke()` / `setPoints()` — `len()`, and a comma-operator default
`latk-main.js:655-670`

```js
if (color === undefined) color = (0,0,0,1);           // :662 — evaluates to the number 1
let lastLayer = this.layers[len(this.layers)-1];      // :656, :664
```

`len()` throws. Note the sibling `setCoords()` at `:672` uses `.length` correctly and works — the three methods were ported inconsistently. The `(0,0,0,1)` default is the comma operator and yields the scalar `1`, not a colour array (same bug at `:673`, where it is currently masked by `setCoords`'s callers always passing a colour).

*Observed:* `ReferenceError: len is not defined`

### A11. `refine()` — unusable via its own default
`latk-main.js:623-653`

`doClean` defaults to `true` (`:627`), so `refine()` calls `clean()` (A1) and throws. Even with `doClean = false` it calls `splitStroke` (A4) and `reduceStroke` (A5).

*Observed:* `ReferenceError: coords is not defined`

### A12. `write()` — the entire export path is non-functional
`latk-main.js:305-446`

This is the most broken function in the library. Six independent defects, any one of which is fatal:

1. **Declared `static` but uses `this.layers`** (`:305`, `:308`). Called as documented — `Latk.write(path)` — `this` is the `Latk` **class**, which has no `layers`. There is no instance `write()` either, so there is no working call form at all.
   *Observed:* `Latk.write('out.json')` → `TypeError: this.layers is not iterable`; `myLatk.write('out.json')` → `TypeError: myLatk.write is not a function`
2. **`"\n".join(array)`** at `:312`, `:318`, `:384`, `:396`, `:399` — Python. `String.prototype.join` does not exist. (Note `:445` uses the correct `s.join("\n")`, so the file is internally inconsistent.)
3. **`for (let [h, frame] of layer.frames)`** at `:314`, `:320`, `:341`, `:410` — this destructures each *element* as an array, i.e. it expects Python's `enumerate()`. `LatkFrame` / `LatkStroke` / `LatkLayer` are plain objects and are not iterable, so this is a `TypeError`. Should be `for (const [h, frame] of layer.frames.entries())`.
4. **`len()` and `str()`** at `:415`, `:420` — Python.
5. **`yUp`, `useScaleAndOffset`, `globalScale`, `globalOffset` referenced as bare globals** at `:350`, `:358-361` — the `this.` prefix is missing. These are instance fields set in the constructor (`:10-13`).
6. **`Latk.download()` is called with its arguments swapped** at `:445`. The signature is `download(strData, filename)` (`:262`) but the call is `Latk.download("saved_" + Date.now() + ".json", s.join("\n"))`. The result would set `link.href` to the literal relative URL `saved_1234.json` and `link.download` to the entire serialised JSON document as a filename. Additionally, `strData` is expected to be a `data:` URI — compare the reference implementation preserved in the commented-out block at `:1000` — but the raw text is never wrapped in `data:text/plain;charset=utf-8,` + `encodeURIComponent(...)`.

Beyond the crashes, the emitted JSON is hand-assembled from tab-indented string fragments and the bracket balance does not hold: the `"\t\t\t]"` that closes the `layers` array is pushed *inside* the per-layer loop (`:424`) and only on the final iteration, while `FINAL_LAYER_LIST` opens `"frames": [` (`:311`) without a matching close in the same fragment.

**Fix:** rewrite as an instance method that builds a plain object and calls `JSON.stringify(obj, null, "\t")`. That deletes items 2, 3, 4 and the bracket-balance problem outright.

### A13. `download()` — undefined `uri` in the fallback branch
`latk-main.js:262-273`

```js
static download(strData, filename) {
    let link = document.createElement('a');
    if (typeof link.download === 'string') { ... }
    else { location.replace(uri); }   // :271 — `uri` is not defined; the parameter is `strData`
}
```

A leftover from a copy-paste; under `"use strict"` this is a `ReferenceError` on any browser without `<a download>`.

---

## B. Data correctness — runs, but produces wrong data

### B14. `jsonToGp` reads its configuration off an undeclared global named `latk`
`latk-main.js:170-256`, specifically `:212` and `:220`

```js
static jsonToGp(data) {
    ...
    if (latk.yUp === false) { ... }              // :212
    if (latk.useScaleAndOffset === true) { ... } // :220
```

`latk` is not a parameter, not a local, and not `this`. The static method reaches into global scope for a variable that happens to be named `latk` and reads `yUp` / `useScaleAndOffset` off **that** object rather than off the `Latk` instance it is populating. Setting `myDrawing.yUp = false` has no effect; setting a *different, unrelated* object named `latk` does.

*Observed:* with no global of that name, `Latk.read()` fails inside its own callback with `ReferenceError: latk is not defined`.

The library appears to work only because all three examples happen to name their variable exactly `latk` (`examples/canvas.html:27`, `examples/p5js.html:23`, `examples/threejs.html:23`), and a top-level `let` in a classic `<script>` is visible to the library's global scope lookups. Rename that variable in a consuming page and every `Latk.read()` breaks with no obvious cause. `readJson()` (`:160`) and the zip branch of `read()` (`:61`) inherit this through the same call.

**Fix:** make `jsonToGp` an instance method (or pass the options in explicitly) and use `this.yUp` / `this.useScaleAndOffset`.

### B15. Scale/offset path throws — missing `latk.` prefix
`latk-main.js:220-224`

```js
if (latk.useScaleAndOffset === true) {
    x = (x * globalScale[0]) + globalOffset[0];   // :221-223 — bare identifiers
```

`globalScale` and `globalOffset` are instance fields (`:12-13`) referenced without any qualifier. Enabling the documented `useScaleAndOffset` feature therefore guarantees a crash.

*Observed:* `ReferenceError: globalScale is not defined`

The same defect exists in `write()` (A12 item 5).

### B16. Stroke and fill alpha silently become `undefined`
`latk-main.js:181-205`

```js
let a = 1.0;
try {
    a = jsonStroke["color"][3];   // :188 — does NOT throw when color has 3 elements
} catch (e) { }
color = [ r,g,b,a ];
```

This `try`/`catch` assumes Python's `IndexError`. In JavaScript, indexing past the end of an array yields `undefined` without throwing, so the `a = 1.0` default is **overwritten with `undefined`** for any three-component colour. Identical bug for `fill_color` at `:200-202` (default `0.0`).

*Observed*, parsing the repo's own `examples/files/latk_logo.latk`: source `"color": [1, 0.0813213586807251, 0]` → parsed `[1, 0.0813213586807251, undefined]`. Every stroke in the shipped sample file has an undefined alpha. Serialising that back out produces `null` in JSON.

**Fix:** `const a = Array.isArray(c) && c.length > 3 ? c[3] : 1.0;` — and drop the `try`/`catch` idiom throughout, since it never fires for the case it was written for.

### B17. `vertex_color` is discarded on every point
`latk-main.js:238-241`

```js
vertex_color = jsonPoint["vertex_color"];
if (isNaN(vertex_color) === true) vertex_color = [ 0,0,0,1 ];
```

`isNaN()` coerces its argument to a number. An array of more than one element stringifies to `"1,1,1,1"`, which coerces to `NaN`, so `isNaN` returns **`true` for every well-formed RGBA array**. The guard therefore resets every vertex colour it is given.

*Observed:* input `vertex_color: [1,1,1,1]` → output `[0,0,0,1]`. Only a single-element array would survive (`isNaN([0.5])` is `false`).

The same coercion mistake is benign for `pressure` / `strength` at `:232` / `:236` because those are scalars — but it does mean a missing `pressure` key yields `isNaN(undefined) === true` and correctly falls back, purely by accident.

**Fix:** `if (!Array.isArray(vertex_color) || vertex_color.length < 4) vertex_color = [0,0,0,1];`

### B18. `frame_number` is never populated — keyframe timing is lost
`latk-main.js:178`

```js
let frame = new LatkFrame();   // no argument
```

`LatkFrame`'s constructor defaults `frame_number` to `0` (`build/latk-frame.js:7`), so **every frame of every loaded file reports `frame_number === 0`**. Any non-contiguous keyframe timing in the source LATK file — the whole point of storing a frame number rather than relying on array position — is silently dropped on read, and `write()` never emits the field either. `parent_location` (`latk-frame.js:10`) is likewise written by the constructor and never read or populated.

*Observed:* parsing `latk_logo.latk` (4 frames) yields `frame_number: 0` on all four.

### B19. Colour range is inconsistent between loaders
`latk-main.js:103` / `:147`, `build/latk-tilt.js:59-62`, `build/latk-quill.js:95-98`

`Latk.read()` preserves LATK's native 0–1 floats. `readTiltBrush()` and `readQuill()` both multiply their channels by 255. So `stroke.color` has a **different unit depending on which entry point produced the object** — a `Latk` is not interchangeable with a `Latk`.

*Observed*, same field, real files:
- `latk_logo.latk` → `[1, 0.0813, 0, undefined]`
- `sketch.tilt` → `[51.0, 51.0, 230.0, 255]`
- `grass_00.quill` → `[132.5, 139.5, 105.9, 255]`

The examples paper over this by hand: `examples/canvas.html:36` multiplies by 255, `examples/p5js_tilt_1.html:43` does not. Feeding a Tilt-loaded document to `write()` would emit out-of-range colours into a LATK file.

**Fix:** normalise everything to 0–1 at the loader boundary (drop the `* 255` in the Tilt and Quill loaders) and update the examples that compensate.

### B20. `yUp` is applied inversely on read vs. write
`latk-main.js:212-218` vs. `:350-356`

```js
// jsonToGp — swaps when yUp is FALSE
if (latk.yUp === false) { y = co[2]; z = co[1]; } else { y = co[1]; z = co[2]; }

// write — swaps when yUp is TRUE
if (yUp === true)       { y = co[2]; z = co[1]; } else { y = co[1]; z = co[2]; }
```

With the default `yUp = true` (`:10`), reading is the identity and writing is a Y/Z swap. A load-then-save round trip flips the axes of the entire drawing. One of the two branches has its condition inverted.

### B21. Two different defaults for `vertex_color`
`build/latk-point.js:10` uses `[0,0,0,0]` (alpha 0); `latk-main.js:228` uses `[0,0,0,1]` (alpha 1). Points created through `setCoords()` / `LatkStroke.setCoords()` are fully transparent; points created by the parser are opaque. Pick one.

### B22. `smoothStroke()` skips the last interior point
`latk-main.js:586`

```js
for (let i=1; i<points.length - 2; i++) {
```

The smoothing kernel at index `i` needs `i-1` and `i+1`, so the last valid index is `points.length - 2` and the bound should be `i < points.length - 1`. As written, the loop stops at `points.length - 3` and leaves one interior point unsmoothed — visible as a kink near the end of every stroke, compounded by `refine()`'s default of 10 smoothing passes.

*Observed:* on a 6-point stroke, indices 1–3 are smoothed and index 4 is returned unchanged.

Minor: `lower` / `upper` / `center` are initialised to the number `0` at `:582-584` and then reassigned to coordinate arrays.

### B23. `clean()`'s pressure remap samples the wrong range
`latk-main.js:462-466`

```js
for (let i=0; i<stroke.points.length; i++) {
    let index = this.remapInt(i, 0, stroke.points.length, 0, pressures.length);
```

`stroke.points` has already been replaced by the simplified point list at `:461`, so the *post*-simplification length is used as the input maximum. The mapping is therefore a uniform stretch across the original pressure array rather than a lookup of the pressures belonging to the points RDP actually retained — pressures end up attached to the wrong vertices. RDP should return the indices of the surviving points so the attributes can be carried across directly.

(Latent until A1 is fixed, but it will be wrong the moment `rdp` exists.)

---

## C. API surface and contract

### C24. `ready` is `true` before Tilt Brush / Quill data has loaded
`latk-main.js:72-114`, `:116-158`, `:16-26`

```js
static readTiltBrush(url) {
    let latk = new Latk(true);   // :74 — constructor sets this.ready = true at :25
    JSZipUtils.getBinaryContent(url, function(err, data) { ... latk.ready = true; });  // :107
    return latk;                 // ready is ALREADY true here
}
```

The `init === true` constructor path sets `ready = true` (`:25`) as part of seeding the empty layer/frame. So `readTiltBrush()` and `readQuill()` return an object that already claims to be ready, and the assignment at `:107` / `:151` is redundant. Consumers polling the flag (`examples/p5js_tilt_1.html:39`, `examples/p5js_quill_1.html:39`) enter the render path on frame 1 and iterate an empty document. It only *looks* harmless because the seeded frame has zero strokes and draws nothing.

`Latk.read()` (`:30`) is correct here — it uses `new Latk()` with `ready = false`.

**Fix:** don't set `ready` in the constructor; or better, see C25.

### C25. No completion or error signal — the whole I/O surface is fire-and-forget
`latk-main.js:29`, `:72`, `:116`; `build/latk-tilt.js:16`; `build/latk-quill.js:16`

All five loaders return a not-yet-populated object and offer no way to await completion or observe failure — only a polled boolean. The JSON branch of `read()` is the clearest case:

```js
xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == "200") { ... }   // :39
};
```

A 404, a 500, or a network failure takes the `else` that doesn't exist: nothing is logged, `ready` stays `false` forever, and the caller polls indefinitely. Raw `XMLHttpRequest` is also long superseded by `fetch`.

**Fix:** return a `Promise<Latk>` from all five loaders (keeping the polled flag for backwards compatibility if needed).

### C26. Errors inside the zip paths are unobservable
`latk-main.js:49-51`, `:77-79`, `:121-123`, `:54-65`

```js
JSZipUtils.getBinaryContent(url, function(err, data) {
    if (err) { throw err; }   // thrown on an XHR event-handler stack — nothing can catch it
```

`throw` inside a JSZipUtils callback unwinds into the XHR event handler, where no caller frame exists to catch it. The `.then()` chains at `:54`, `:60`, `:82`, `:89`, `:126`, `:133` have no `.catch()`. And if the archive layout differs — `zip.file("metadata.json")` returns `null` for a `.tilt` written by a different tool — `null.async(...)` produces a bare unhandled promise rejection with no indication of which file or which entry was at fault.

### C27. Fragile format sniffing and blind zip-entry selection
`latk-main.js:32`, `:56-60`

```js
let extension = url.split(".")[url.split(".").length-1].toLowerCase();   // :32
```

Splits the entire URL on `.` and takes the last piece, so `data.json?v=2` → `json?v=2` (falls through to the zip branch and fails), an extension-less URL takes the wrong branch, and a path with a dot in a directory name misroutes. Strip the query/hash and take the basename.

In the zip branch:

```js
var entries = Object.keys(zip.files).map(...);   // :56 — built, then only entries[0] is used
zip.file(entries[0].name).async("string")...     // :60
```

`entries[0]` is assumed to be the JSON payload. For an archive containing a directory entry, a `__MACOSX/` folder, or more than one file, this parses the wrong entry. (`entries` is also computed and then discarded in `readTiltBrush` `:84`, `readQuill` `:128`, `TiltLoader.read` `:27`, and `QuillLoader.read` `:27` — dead code in four places.) Filter for a `.json` entry with `dir === false`.

### C28. `QuillLoader.numStrokes` is always `NaN`
`build/latk-quill.js:13`, `:72`

```js
this.numStrokes;                        // :13 — declared, never assigned → undefined
...
this.numStrokes += numNodeStrokes;      // :72 — undefined + n === NaN
```

*Observed:* parsing `examples/files/grass_00.quill` yields 234 strokes with `numStrokes: NaN`. Initialise to `0`. (`TiltLoader` is fine — it assigns at `latk-tilt.js:52`.) Both loaders also append to `this.strokes` without clearing it, so calling `parse()` twice on one loader silently doubles the data.

### C29. Stub and non-functional API surface
- `readBase64()` — `latk-main.js:166` — empty `// TODO`.
- `gpToJson()` — `:258` — empty stub that returns `undefined`. This is the counterpart to `jsonToGp` and the natural place for the serialisation logic that `write()` botches.
- `jsonContains(json, name)` — `:296` — does `"" + json` then `indexOf`. For any object that is `"[object Object]"`, so the function returns `false` for essentially every real input. Nothing calls it.
- `LatkUtil` — `build/latk-util.js` — an empty class, and it is not in either build script's file list, so it is not even bundled.

### C30. Vestigial Python and dead state
- `LatkLayer.getInfo(self)` — `build/latk-layer.js:19` — retains Python's `self` parameter, unused; the body correctly uses `this`.
- `counter`, `loopCounter`, `previousFrame` — `build/latk-layer.js:12-14`, marked "for compatibility with old project" — written by the constructor, never read by the library.
- `frame_rate`, `clearExisting` — `latk-main.js:8-9` — set, never read.
- `LatkFrame` and `LatkLayer` constructors `console.log` on **every** frame and layer (`latk-frame.js:12`, `latk-layer.js:16`). Parsing `grass_00.quill` floods the console; on a large multi-frame file this is a measurable parse-time cost, not just noise.

---

## D. Packaging and build

### D31. The npm package cannot be loaded outside a browser and exports nothing
`package.json:5`

`"main": "latk.js"`, but:

1. The bundle has no UMD/CJS/ESM wrapper of its own. `Latk`, `LatkLayer`, `LatkFrame`, `LatkStroke`, `LatkPoint`, `TiltLoader`, and `QuillLoader` are bare `class` declarations at bundle scope. Under `"use strict"` they are not attached to `globalThis` and there is no `module.exports`, so **nothing is exported** even where the file does load.
2. The bundled `jszip-utils.min.js` dereferences `window` at load time.

*Observed:* `require('/path/to/latk.js')` → `ReferenceError: window is not defined` at `latk.js:53`.

So `npm install latk` followed by `require('latk')` or `import` fails outright; the package works only as a `<script>` tag. Add a UMD or ESM wrapper exporting the public classes, and set `"browser"` / `"exports"` accordingly.

### D32. `"use strict"` is imposed on bundled third-party code
`build/latk-header.js:26`, `build/build.command:22`

The header is concatenated first and `"use strict"` is its first statement, so the directive is the bundle's file-level prologue and applies to `jszip.min.js` and `jszip-utils.min.js`, which were neither authored nor minified under it. It happens to work with JSZip 3.1.3 (verified: the bundle loads and parses all three sample formats), but it is gratuitous risk that will bite on the next dependency bump. Wrap each source file in its own IIFE, or move `"use strict"` inside a library-only wrapper.

### D33. Vendored JSZip is from 2016
`build/libraries/jszip/jszip.min.js` — JSZip v3.1.3. Nine years of fixes behind. Prefer a declared dependency over a vendored copy; if vendoring must stay, update it.

### D34. No tests
`package.json:10` — `"test": "echo \"No test specified\""`. A smoke test that constructs a `Latk` and calls each public method once would have caught all fifteen crashes in §A. The three sample files already in `examples/files/` are ready-made fixtures.

### D35. No lint, no CI
There is no ESLint config, no CI workflow. As noted above, `no-undef` alone catches essentially all of §A statically. This is the cheapest, highest-leverage change in this report and should land before any individual fix.

### D36. `.npmignore` has a typo — the examples ship to npm
`.npmignore:2` excludes `example/*`, but the directory is `examples/`. The published tarball therefore includes `examples/`, and with it `p5.min.js`, `three.min.js`, and the `.tilt` / `.quill` / `.latk` sample assets. Change to `examples/`, or better, switch to an allowlist via `package.json`'s `files` field.

### D37. Build script robustness
`build/build.command:17-19`

`rm $BUILD_TARGET` runs unconditionally and errors on a clean checkout where `latk.js` doesn't exist (use `rm -f`). `cd $DIR` is unquoted and breaks on a path with spaces. Nothing checks that `uglifyjs` is present or that it succeeded, so a missing minifier silently leaves a stale `latk.min.js` next to a fresh `latk.js` — and `latk.min.js` is currently dated Nov 2023 against a `latk.js` dated Apr 2024, which is exactly that failure mode. Add `set -euo pipefail`.

### D38. `tools/latk-decoder.js` is a divergent copy of the library
`tools/latk-decoder.js` re-declares `LatkPoint`, `LatkStroke`, `LatkFrame`, `LatkLayer`, and `Latk` rather than consuming the build output, and carries the identical bugs — `rdp` at `tools/latk-decoder.js:324`, the same `len` / `str` / `sqrt` Python-isms throughout. Two copies of the same broken code will drift as one side is fixed. Have the decoder load `latk.js` instead.

---

## E. Examples

### E39. Every example breaks on a file whose layers have different frame counts
`examples/canvas.html:34-35,48`; `examples/p5js.html:40-41,55`; `examples/threejs.html:104-105,125`

```js
for (let layer of latk.layers) {
    for (let stroke of layer.frames[counter].strokes) { ... }   // indexes EVERY layer by counter
}
...
if (counter > latk.layers[0].frames.length-1) counter = 0;      // bounded by layer 0 only
```

`counter` is wrapped against `layers[0]`'s frame count but used to index all layers. Any file where layer 1 is shorter than layer 0 throws `TypeError: Cannot read properties of undefined (reading 'strokes')`. This is precisely what `getLongestLayer()` / `getLoopFrame()` exist to solve — except both of those throw (A8, A9). Clamp per layer.

### E40. Examples depend on their variable being named exactly `latk`
See B14. The examples are, in effect, a workaround for a library bug, and they don't document the constraint.

### E41. Examples disagree with each other on colour range
`examples/canvas.html:36` scales by 255; `examples/p5js_tilt_1.html:43` passes the array straight to `stroke()`. Both are locally correct given B19 — which is the point: the inconsistency is in the library, and the examples encode it.

---

## Suggested triage order

1. **Add ESLint (`no-undef`, `no-unused-vars`) and wire it into the build.** Catches all of §A statically. (D35)
2. **Add a smoke test** that loads each of the three sample files in `examples/files/` and calls every public method. (D34)
3. **Fix the silent data corruption**, since it affects code that currently appears to work: B16 (alpha `undefined`), B17 (`vertex_color` discarded), B18 (`frame_number` lost), B19 (colour range).
4. **Fix `jsonToGp`'s global dependency** (B14/B15) — make it an instance method. This is the bug most likely to break a downstream user with no diagnosable cause.
5. **Rewrite `write()`** (A12) as an instance method over `JSON.stringify`, and fix `download()` (A13, and the swapped call). Verify round-trip fidelity, which also settles B20 (`yUp`).
6. **Port the processing utilities properly** (A1–A11) — they need a real RDP implementation and a pass converting `len`/`str`/`sqrt`/`.remove`/`.insert`/`"".join` to their JS equivalents. Rebuild-into-new-array instead of mutate-during-iteration throughout.
7. **Give the loaders a Promise API** with real error propagation (C25, C26), and fix `ready` (C24).
8. **Fix packaging** (D31, D36) so the npm package is usable, and de-duplicate `tools/latk-decoder.js` (D38).
