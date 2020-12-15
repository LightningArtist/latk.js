/*
The Lightning Artist Toolkit was developed with support from:
   Canada Council on the Arts
   Eyebeam Art + Technology Center
   Ontario Arts Council
   Toronto Arts Council
   
Copyright (c) 2020 Nick Fox-Gieg
https://fox-gieg.com

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
*/

"use strict";


class LatkThree extends Latk {

	constructor(init, coords, color) {
		super(init, coords, color);
	}

	convertLatkToThree() {
		this.globalScale = new THREE.Vector3(this.globalScale[0], this.globalScale[1], this.globalScale[2]);
		this.globalOffset = new THREE.Vector3(this.globalOffset[0], this.globalOffset[1], this.globalOffset[2]);

		for (let layer of this.layers) {
			for (let frame of layer.frames) {
				frame.parent_location = new THREE.Vector3(frame.parent_location[0], frame.parent_location[1], frame.parent_location[2]);

				for (let stroke of frame.strokes) {
					stroke.color = new THREE.Color(stroke.color[0], stroke.color[1], stroke.color[2], stroke.color[3]);
					stroke.fill_color = new THREE.Color(stroke.fill_color[0], stroke.fill_color[1], stroke.fill_color[2], stroke.fill_color[3]);
					
					for (let point of frame.points) {
						point.co = new THREE.Vector3(point.co[0], point.co[1], point.co[2]);
						point.vertex_color = new THREE.Color(point.vertex_color[0], point.vertex_color[1], point.vertex_color[2], point.vertex_color[3]);
					}
				}
			}
		}
	}

	convertThreeToLatk() {
		this.globalScale = [ this.globalScale.x, this.globalScale.y, this.globalScale.z ];
		this.globalOffset = [ this.globalOffset.x, this.globalOffset.y, this.globalOffset.z ];

		for (let layer of this.layers) {
			for (let frame of layer.frames) {
				frame.parent_location = [ frame.parent_location.x, frame.parent_location.y, frame.parent_location.z ];

				for (let stroke of frame.strokes) {
					stroke.color = [ stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a ];
					stroke.fill_color = [ stroke.fill_color.r, stroke.fill_color.g, stroke.fill_color.b, stroke.fill_color.a ];
					
					for (let point of frame.points) {
						point.co = [ point.co.x, point.co.y, point.co.z ];
						point.vertex_color = [ point.vertex_color.r, point.vertex_color.g, point.vertex_color.b, point.vertex_color.a ];
					}
				}
			}
		}
	}

}


