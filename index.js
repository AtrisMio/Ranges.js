(function(name, definition) {
	if (typeof module != 'undefined') module.exports = definition();
	else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
	else this[name] = definition();
}('Ranges', function() {
	/**
	 * 自然数级别的区间计算库；也可用于字符串区间（直接使用字符串对比），但此时不支持区间减法。
	 * nature number ranges calculate library, also support string ranges without subtraction.
	 */
	// 点、区对比结果  point vs range compare result
	var PR_RESULT = {
		BEFORE : -1, // 1 vs [2,3]
		IN : 1, // 1 vs [1,2]
		AFTER : 2 // 3 vs [1,2]
	};
	// 区、区对比结果  range vs range compare result
	var RR_RESULT = {
		BEFORE : -3, // [1,2] vs [3,4]
		C_BEFORE : -2, // [1,3] vs [2,4]
		CONTAIN : -1, // [1,4] vs [2,3]
		IN : 1, // [2,3] vs [1,4]
		C_AFTER : 2, // [2,4] vs [1,3]
		AFTER : 3 // [3,4] vs [1,2]
	};
	// 通过点区对比结果快速查区区对比结果，即通过a与[c,d]、b与[c,d]的结果来计算[a,b]与[c,d]的对比结果
	// calculate ([a,b] vs [c,d]) result by results of (a vs [c,d]) and (b vs [c,d]),
	var RR_MAP = {};

	// --- when a before [c,d]
	var o = RR_MAP[PR_RESULT.BEFORE] = {};
	// when b before [c,d], [a,b] before [c,d]
	o[PR_RESULT.BEFORE] = RR_RESULT.BEFORE;
	// when b in [c,d], [a,b] before and connect to [c,d]
	o[PR_RESULT.IN] = RR_RESULT.C_BEFORE;
	// when b after [c,d], [a,b] contain [c,d]
	o[PR_RESULT.AFTER] = RR_RESULT.CONTAIN;

	// --- when a in [c,d]
	o = RR_MAP[PR_RESULT.IN] = {};
	o[PR_RESULT.IN] = RR_RESULT.IN;
	o[PR_RESULT.AFTER] = RR_RESULT.C_AFTER;

	// --- when a after [c,d]
	o = RR_MAP[PR_RESULT.AFTER] = {};
	o[PR_RESULT.AFTER] = RR_RESULT.AFTER;

	// compare point and range, return PR_RESULT
	var comparePR = function(v, r){
		return v<r[0] ? PR_RESULT.BEFORE : (v<=r[1] ? PR_RESULT.IN : PR_RESULT.AFTER);
	};
	// compare range and range, return RR_RESULT
	var compareRR = function(r1, r2){
		return RR_MAP[comparePR(r1[0], r2)][comparePR(r1[1], r2)];
	};
	var isInt = function(n){
		return Number(n)===n && n%1===0;
	}
	// 判断两个区间是否连接
	// if range1 and range2 are adjacent
	var isAdjacentRR = function(r1, r2){
		var a = r1[1], b = r2[0];
		if(!isInt(a) || !isInt(b)){
			return false;
		}
		return a + 1 === b;
	};
	// 区间相加
	// range addition
	var addRR = function(r1, r2){
		switch(compareRR(r1, r2)){
			case RR_RESULT.BEFORE:
				return isAdjacentRR(r1, r2) ? [[r1[0], r2[1]]] : [r1, r2];
			case RR_RESULT.IN:
				return [r2];
			case RR_RESULT.AFTER:
				return isAdjacentRR(r2, r1) ? [[r2[0], r1[1]]] : [r2, r1];
			case RR_RESULT.C_BEFORE:
				return [[r1[0], r2[1]]];
			case RR_RESULT.C_AFTER:
				return [[r2[0], r1[1]]];
			case RR_RESULT.CONTAIN:
				return [r1];
		}
	};

	// 区间相减
	// range subtraction
	var subRR = function(r1, r2){
		switch(compareRR(r1, r2)){
			case RR_RESULT.BEFORE:
				return [r1];
			case RR_RESULT.IN:
				return [];
			case RR_RESULT.AFTER:
				return [r1];
			case RR_RESULT.C_BEFORE:
				return [[r1[0], r2[0]-1]];
			case RR_RESULT.C_AFTER:
				return [[r2[1]+1, r1[1]]];
			case RR_RESULT.CONTAIN:
				return [[r1[0], r2[0]-1], [r2[1]+1, r1[1]]];
		}
	};

	function Ranges(a, b){
		this.ranges = a instanceof Array ? a : [[a, b]];
		this._connectRange();
	}

	Ranges.prototype = {
		// 连接、组合相连的区间
		// [ [1,2], [3,4], [3,6], [8,9] ]  ->  [ [1,6], [8,9] ]
		_connectRange : function(){
			var ranges = this.ranges;
			ranges.sort(compareRR);
			var results = [], r1 = ranges[0], i, r2, result;
			for(i=1; i<ranges.length; i++){
				r2 = ranges[i];
				result = addRR(r1, r2);
				results = results.concat(result);
				r1 = results.pop();
			}
			results.push(r1);
			return (this.ranges = results);
		},
		/**
		 * 添加区间
		 * @param {Array} r1 例如 [1,3]
		 */
		add : function(r1){
			this.ranges.push(r1);
			this._connectRange();
			return this;
		},
		/**
		 * 减去区间
		 * @param {Array} r2 例如 [1,3]
		 */
		sub : function(r2){
			if(!isInt(r2[0])){
				throw new Error('Not support non integer range');
			}
			var ranges = this.ranges;
			var results = [], i, result;
			for(i=0; i<ranges.length; i++){
				r1 = ranges[i];
				result = subRR(r1, r2);
				results = results.concat(result);
			}
			this.ranges = results;
			return this;
		},
		/**
		 * 判断区间是否有冲突
		 * @param {Array} range 例如 [1,3]
		 * @returns {boolean}
		 */
		isConflict : function(range){
			var ranges = this.ranges, i;
			for(i=0; i<ranges.length; i++){
				switch(compareRR(ranges[i], range)){
					case RR_RESULT.IN:
					case RR_RESULT.C_BEFORE:
					case RR_RESULT.C_AFTER:
					case RR_RESULT.CONTAIN:
						return true;
				}
			}
			return false;
		},
		/**
		 * 判断点是否在区间内
		 * @param {Number} point
		 * @returns {boolean}
		 */
		isContain : function(point){
			var ranges = this.ranges, i;
			for(i=0; i<ranges.length; i++){
				if(comparePR(point, ranges[i]) === PR_RESULT.IN){
					return true;
				}
			}
			return false;
		}
	};
	return Ranges;
}));