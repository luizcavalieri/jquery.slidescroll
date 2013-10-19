/*! Copyright (c) 2013 Florian Pichler <pichfl@einserver.de>
 * Licensed under the MIT License
 *
 * Version: 1.0.0
 *
 * Slidescroll is a jQuery plugin inspired by Apple's product page for the iPhone 5s
 */

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['.'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS style for Browserify
		module.exports = factory;
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	/**
	 * Slidescroll class
	 *
	 * @param element a selector or dom element used as base
	 * @param options an object which overwrites the class defaults
	 * @constructor
	 */
	var Slidescroll = function (element, options) {
		this.$element = $(element);
		this.options = $.extend({}, Slidescroll.DEFAULTS, options);
		this.$pages = this.$element.find(this.options.pagesSelector);
		this.$nav = $('<nav role="navigation" class="slidescroll-nav" />');
		this.$navItems = $();
		this.pageKeys = [];

		var initialPageData = this.$element.data('slidescroll-initial-page');
		if ($.type(initialPageData) === 'number') {
			this.options.initialPage = initialPageData;
		}
		this.current = this.options.initialPage;

		this.build();
	};

	// The default options
	Slidescroll.DEFAULTS = {
		pagesSelector: '> *',
		css3: window.Modernizr.csstransforms3d,
		initialPage: 0,
		activeClassName: 'active',
		moved: null, // function called after each transition, bound to the current
					// instance. The current index is passed as parameter
		beforemove: null // function called before a transition
						// the current and next index are passed
	};

	/**
	 * Builds and adjusts the dom
	 * @TODO: Create unbuild method to reverse all changes
	 */
	Slidescroll.prototype.build = function () {
		this.$pages.each(function (index, item) {
			var $item = $(item);
			var titleSelector = $item.data('slidescroll-title-selector');
			var titleData = $item.data('slidescroll-title');
			var pageUrl = $item.data('slidescroll-url');

			// Position item for slide effect
			$item.css({
				'top': '' + (100 * index) + '%'
			});

			// Add or create page-key (used for hash navigation)
			var key = 'page-' + index;

			if (titleSelector) {
				key = encodeURI(titleSelector);
			}
			if (pageUrl) {
				key = pageUrl;
			}

			this.pageKeys[index] = key;

			// Prepare Navigation
			var el = $('<a />');
			var title = ['<span class="index">', index + 1, '</span>'];

			if (titleData || titleSelector) {
				$.merge(title, [
					' <span class="title">',
					titleData || $item.find(titleSelector).first().text(),
					'</span>'
				]);
			}

			el.html(title.join(''));
			el.data('target-slide', index);
			el.attr('href', '#' + key);

			if (index === this.current) {
				el.addClass(this.options.activeClassName);
			}

			this.$nav.append(el);
		}.bind(this));

		this.$navItems = this.$nav.children();
		this.$element.after(this.$nav);

		// Init hash
		this.current = this.validIndex(this.hash());
		this.show(this.current);

		// Attach Events
		this.attach();
	};

	/**
	 * Attach various events
	 * @TODO: Create detach method to tear this down
	 */
	Slidescroll.prototype.attach = function () {
		$(window).on({
			'hashchange.slidescroll': this.changedHash.bind(this)
		});

		$(document).on({
			'keydown.slidescroll': function (event) {
				var tag = event.target.tagName.toLowerCase();

				if (tag !== 'input' && tag !== 'textarea') {
					var key = event.keyCode;
					var shift = event.shiftKey;

					if ((key === 32 && !shift) || key === 40) {
						this.showNext();
						event.preventDefault();
					} else if ((key === 32 && shift) || key === 38) {
						this.showPrevious();
						event.preventDefault();
					} else if (key === 36) {
						this.showFirst();
						event.preventDefault();
					} else if (key === 35) {
						this.showLast();
						event.preventDefault();
					}
				}
			}.bind(this)
		});

		// Enable scrolling, requires jquery.mousewheel
		if ($.fn.mousewheel) {
			this.scrollLock = 0;

			$(window).on({
				'mousewheel.slidescroll': function (event, delta, deltaX, deltaY) {
					event.preventDefault();

					var newLock = 'showNext'; // scroll down
					if (delta > 0) { // scroll up
						newLock = 'showPrevious';
					}

					if (newLock !== this.scrollLock) {
						this[newLock]();
						this.scrollLock = newLock;
					}
				}.bind(this)
			});
		}

		// Enable Touch

		// Enable callback after each transition
		this.$element.on({
			'webkitTransitionEnd.slidescroll otransitionend.slidescroll oTransitionEnd.slidescroll msTransitionEnd.slidescroll transitionend.slidescroll': function () {
				if ($.type(this.options.moved) === 'function') {
					this.options.moved.apply(this, [
						this.current,
						this.pageKeys[this.current]
					]);
				}
			}.bind(this)
		});
	};

	/**
	 * Maps a passed key to it's index and checks for availability
	 *
	 * @param indexOrKey
	 * @returns int index
	 */
	Slidescroll.prototype.validIndex = function (indexOrKey) {
		var index = $.inArray(indexOrKey, this.pageKeys);

		if ($.type(indexOrKey) === 'string' && index) {
			return index;
		} else if (indexOrKey < this.$pages.length && indexOrKey >= 0) {
			return indexOrKey;
		}

		return 0;
	};

	/**
	 * Show a page by index or key (validated)
	 * @param indexOrKey string or int
	 */
	Slidescroll.prototype.show = function (indexOrKey) {
		var index = this.validIndex(indexOrKey);

		if ($.type(this.options.beforemove) === 'function') {
			this.options.beforemove.apply(this, [
				this.current,
				index
			]);
		}

		this.$navItems.removeClass(this.options.activeClassName);
		this.$navItems.eq(index).addClass(this.options.activeClassName);

		if (this.options.css3) {
			this.$element.css('transform', 'translate3d(0,' + (-100 * index) + '%,0)');
		} else {
			this.$element.css('top', '' + (-100 * index) + '%');
		}

		this.hash(index);
		this.current = index;
	};

	/**
	 * Show first page
	 */
	Slidescroll.prototype.showFirst = function () {
		this.show(0);
	};

	/**
	 * Show last page
	 */
	Slidescroll.prototype.showLast = function () {
		this.show(this.$pages.length - 1);
	};

	/**
	 * Show page after current page, if it exists
	 */
	Slidescroll.prototype.showNext = function () {
		this.show(this.current +1);
	};

	/**
	 * Show page before current page, if it exists
	 */
	Slidescroll.prototype.showPrevious = function () {
		this.show(this.current -1);
	};

	/**
	 * Sets the location hash to either the passed string or
	 * the string stored for the passed index
	 *
	 * If param is left empty returns the current hash
	 *
	 * @param newHash string or integer
	 */
	Slidescroll.prototype.hash = function(newHash) {
		if (newHash === undefined) {
			return window.location.hash.substr(1);
		} else {
			if ($.type(newHash) === 'number') {
				newHash = this.pageKeys[newHash];
			}
			window.location.hash = newHash;
			return this;
		}
	};

	/**
	 * Callback for the global hash change event
	 * Tries to find and navigate to the page specified by the new hash
	 *
	 * @param event
	 */
	Slidescroll.prototype.changedHash = function (event) {
		var newIndex = $.inArray(this.hash(), this.pageKeys);
		if (newIndex !== -1 && this.pageKeys[newIndex] !== this.pageKeys[this.current]) {
			this.current = newIndex;
			this.show(newIndex);
		}
	};

	// Store previous for no conflict handling
	var old = $.fn.slidescroll;

	// Plugin definition
	$.fn.slidescroll = function (option) {
		return this.each(function () {
			var $this = $(this);
			var data = $this.data('pagescroll');
			var options = $.extend({}, Slidescroll.DEFAULTS, $this.data(), typeof option === 'object' && option);

			if (!data) {
				$this.data('pagescroll', (data = new Slidescroll(this, options)));
			}
		});
	};

	$.fn.slidescroll.Constructor = Slidescroll;

	// No conflict support
	$.fn.slidescroll.noConflict = function () {
		$.fn.slidescroll = old;
		return this;
	};

}));
