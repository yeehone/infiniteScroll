;
(function(name, definition) {
	if (typeof module != 'undefined') module.exports = definition();
	else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
	else this[name] = definition();
}('InfiniteScroll', function() {
	"use strict"
	
	var InfiniteScroll = function(opt) {
		if (!(this instanceof InfiniteScroll))
			return new InfiniteScroll(data);
		var self = this;

		self.container = opt.container;
		self.wrapper = opt.wrapper || 'div';
		self.throttleTime = opt.throttleTime || 300;
		self.range = opt.range || 2;

		if (!self.container) {
			throw new Error("Error! Could not find container");
		}

		InfiniteScroll.viewportHeight = document.documentElement.clientHeight;

		var tmp = [];
		for (var i = -self.range * 3; i <= self.range * 3; i++) {
			tmp.push(i);
		}
		InfiniteScroll.rangeArr = tmp;

		self.currentSlot = 0;
		self.prevSlot = 0;
		self.slots = [];

		self.scrollFn = throttle(function(e) {
			var current = self.currentSlot = self.getCurrent();
			var prev = self.prevSlot;
			if (prev == current) {
				return;
			}
			var prevNotInCurrent = getANotInB(self.getSlotArr(prev), self.getSlotArr(current));
			console.log('---------------------------------------------------');
			console.log('prev slotArr: ', prev, self.getSlotArr(prev));
			console.log('current slotArr: ', current, self.getSlotArr(current));
			console.log('prevNotInCurrent: ', prevNotInCurrent);
			self.execCurrentState(current);
			self.execState(prevNotInCurrent, InfiniteScroll.state.removed);
			self.prevSlot = current;
		}, self.throttleTime);
		window.addEventListener('scroll', self.scrollFn, false);
	}

	InfiniteScroll.viewportHeight = 0;
	InfiniteScroll.rangeArr = [];

	InfiniteScroll.state = {
		visible: 0,
		invisible: 1,
		removed: 2
	}

	InfiniteScroll.prototype.append = function(html) {
		var wrapper = document.createElement(this.wrapper);
		var seq = this.slots.length;
		// var height;

		wrapper.setAttribute('__infinite_seq__', seq);
		wrapper.innerHTML = html;

		this.container.appendChild(wrapper);
		// height = wrapper.clientHeight;

		this.slots.push({
			wrapper: wrapper,
			html: html,
			state: -1
		})
	}

	InfiniteScroll.prototype.update = function(html) {
		this.currentSlot = 0;
		this.prevSlot = 0;
		this.slots = [];
		this.container.innerHTML = '';
		this.append(html);
	}


	InfiniteScroll.prototype.getState = function(seq) {
		var current = this.currentSlot;
		var distance = Math.abs(current - seq);
		var state;
		if (distance > 2 * this.range) {
			state = InfiniteScroll.state.removed;
		} else if (distance > 1 * this.range) {
			state = InfiniteScroll.state.invisible;
		} else {
			state = InfiniteScroll.state.visible;
		}
		return state;
	}

	InfiniteScroll.prototype.execState = function(arr, state) {
		arr = [].concat(arr);
		var seq;
		var self = this;
		var states = InfiniteScroll.state;
		var oldState;
		var wrapper;
		var slot;
		var doExec = function(seq, newState) {
			slot = self.slots[seq];
			if (!slot) {
				return
			}
			wrapper = slot.wrapper;
			oldState = slot.state;
			console.log('doExec: seq', seq, 'oldState', oldState, 'newState', newState);
			switch (newState) {
				case states.visible:
					if (wrapper.innerHTML == '' || oldState == states.removed) {
						wrapper.innerHTML = slot.html;
						wrapper.style.height = 'auto';
					}
					wrapper.style.visibility = '';
					break;
				case states.invisible:
					wrapper.style.visibility = 'hidden';
					break;
				case states.removed:
					var height = wrapper.clientHeight;
					wrapper.innerHTML != '' && (slot.html = wrapper.innerHTML);
					wrapper.style.height = height + 'px';
					wrapper.innerHTML = '';
					break;
			}
			slot.state = newState;
		}
		for (var i = 0, len = arr.length; i < len; i++) {
			seq = arr[i];
			doExec(seq, state);
		}
	}

	InfiniteScroll.prototype.getSlotArr = function(index) {
		var a = InfiniteScroll.rangeArr;
		var arr = [];
		var b;
		for (var i = 0, len = a.length; i < len; i++) {
			b = index + a[i];
			if (b >= 0) {
				arr.push(b);
			}
		}
		return arr;
	}

	InfiniteScroll.prototype.execCurrentState = function(current) {
		var states = InfiniteScroll.state;
		var range = this.range;
		var visibleArr = [];
		var invisibleArr = [];
		var removedArr = [];
		var distance;
		for (var i = current - 3 * range; i <= current + 3 * range; i++) {
			distance = Math.abs(current - i);
			if (distance > 2 * this.range) {
				removedArr.push(i);
			} else if (distance > 1 * this.range) {
				invisibleArr.push(i);
			} else {
				visibleArr.push(i);
			}
		}
		this.execState(visibleArr, states.visible);
		this.execState(invisibleArr, states.invisible);
		this.execState(removedArr, states.removed);
	}

	InfiniteScroll.prototype.getCurrent = function() {
		var current = this.prevSlot;

		var slot;
		var rect;
		var position = 1;
		var lastPosition;
		var t = 0;
		var max = this.slots.length;
		var record = [];

		while (position != 0 && t < max) { // max 做一下保护，防止死循环
			slot = this.slots[current];
			if (!slot) {
				break;
			}
			rect = slot.wrapper.getBoundingClientRect();
			position = this.getPosition(rect);
			// 如果viewport中线刚好在两个slot之间的margin内。。那么position会在1和-1之间一直摇摆,
			// 所以如果发现position不为0，且上次与本次不同，则认为是这个case，直接返回其中一个即可
			if (position != 0 && lastPosition && lastPosition != position) {
				break;
			}

			current -= position; // 游标移动
			lastPosition = position;

			t++;

			record.push({
				rect: rect,
				current: current,
				position: position,
				t: t
			});
		}

		console.log('t', t);
		if (t == max) {
			console.warn('record', record);
		}

		if (slot) {
			this.currentSlot = current;
		} else {
			throw new Error('Error! Could not get current slot');
		}

		return current;
	}

	InfiniteScroll.prototype.getPosition = function(rect) {
		var vh = InfiniteScroll.viewportHeight;
		var position;
		if (rect.top < 0 && rect.bottom > vh || rect.top >= 0 && rect.top < vh / 2 || rect.bottom <= vh && rect.bottom > vh / 2) {
			position = 0;
		} else if (rect.bottom <= vh / 2) {
			position = -1;
		} else {
			position = 1;
		}
		return position;
	}

	InfiniteScroll.prototype.clear = function() {
		this.currentSlot = 0;
		this.prevSlot = 0;
		this.slots = [];
		window.removeEventListener('scroll', this.scrollFn, false);
	}

	/**
	 * 频率控制 返回函数连续调用时，func 执行频率限定为 次 / wait
	 * 
	 * @param  {function}   func      传入函数
	 * @param  {number}     wait      表示时间窗口的间隔
	 * @param  {object}     options   如果想忽略开始边界上的调用，传入{leading: false}。
	 *                                如果想忽略结尾边界上的调用，传入{trailing: false}
	 * @return {function}             返回客户调用函数   
	 */
	var throttle = function(func, wait, options) {
		var context, args, result;
		var timeout = null;
		// 上次执行时间点
		var previous = 0;
		if (!options) options = {};
		// 延迟执行函数
		var later = function() {
			// 若设定了开始边界不执行选项，上次执行时间始终为0
			previous = options.leading === false ? 0 : Date.now();
			timeout = null;
			result = func.apply(context, args);
			if (!timeout) context = args = null;
		};
		return function() {
			var now = Date.now();
			// 首次执行时，如果设定了开始边界不执行选项，将上次执行时间设定为当前时间。
			if (!previous && options.leading === false) previous = now;
			// 延迟执行时间间隔
			var remaining = wait - (now - previous);
			context = this;
			args = arguments;
			// 延迟时间间隔remaining小于等于0，表示上次执行至此所间隔时间已经超过一个时间窗口
			// remaining大于时间窗口wait，表示客户端系统时间被调整过
			if (remaining <= 0 || remaining > wait) {
				clearTimeout(timeout);
				timeout = null;
				previous = now;
				result = func.apply(context, args);
				if (!timeout) context = args = null;
				//如果延迟执行不存在，且没有设定结尾边界不执行选项
			} else if (!timeout && options.trailing !== false) {
				timeout = setTimeout(later, remaining);
			}
			return result;
		};
	}

	var getANotInB = function(a, b) {
		return a.filter(function(i) {
			return b.indexOf(i) < 0;
		});
	}

	return InfiniteScroll;
}));
