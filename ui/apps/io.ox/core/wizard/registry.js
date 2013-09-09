/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2013
 * Mail: info@open-xchange.com
 *
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */
define('io.ox/core/wizard/registry', ['io.ox/core/extensions', 'io.ox/core/tk/dialogs', 'gettext!io.ox/core/wizard'], function (ext, dialogs, gt) {
	'use strict';

	function Wizard(options) {
		var state = 'stopped';
		var batons = {};
		var pages = {};
		var nextEnabled = false;
		var self = this;
		
		this.options = options;
		this.runOptions = null;

		this.index = 0;
		this.length = 0;

		this.currentPage = null;
		this.previousPage = null;
		this.nextPage = null;
		this.dialog = new dialogs.ModalDialog({easyOut: false});

		this.navButtons = $("<div/>").append(
			$('<button class="btn prev">').text(gt("Previous").on("click", function () {
				self.back();
			})),
			$('<button class="btn btn-primary next btn-disabled">').text(gt("Next").on("click", function () {
				if (nextEnabled) {
					self.next();
				}
			})),
			$('<button class="btn btn-primary done btn-disabled">').text(gt("Done").on("click", function () {
				if (nextEnabled) {
					self.done();
				}
			}))
		);

		this.dialog.getContentControls().append(this.navButtons);
		

		function getBaton(index) {
			if (_.isUndefined(index)) {
				index = self.index;
			}
			if (batons[index]) {
				return batons[index];
			}
			var baton = ext.Baton.ensure(this.runOptions);
			baton.wizard = self;
			baton.ready = $.Deferred();

			batons[index] = baton;
			return baton;
		}

		function callMethod(page, methodName, index) {
			if (page[methodName] && _.isFunction(page[methodName])) {
				return page[methodName](getBaton(index));
			}
			return null;
		}

		function triggerLoad(page, index) {
			var baton = getBaton(index);
			if (baton.ready.state() !== 'pending') {
				return;
			}

			if (page.load) {
				var def = page.load(baton);
				if (def) {
					def.done(baton.ready.resolve).fail(baton.ready.reject);
				}
				return baton.ready;
			}

			baton.ready.resolve();
			baton.completed = false;

			baton.buttons = {
				nextEnabled: false
			};

			baton.buttons.enableNext = function () {
				baton.buttons.nextEnabled = true;
				baton.wizard.updateButtonState();
			};

			baton.buttons.disableNext = function () {
				baton.buttons.nextEnabled = false;
				baton.wizard.updateButtonState();
			};

			return baton.ready;
		}

		function triggerPreLoad(page, index) {
			var baton = getBaton(index);
			if (baton.ready.state() !== 'pending') {
				return;
			}

			if (page.options && !_.isUndefined(page.options.preLoad) && !page.options.preLoad) {
				return;
			}

			if (page.preLoad) {
				page.preLoad(baton);
				return;
			}

			if (page.load) {
				var def = page.load(baton);
				if (def) {
					def.done(baton.ready.resolve).fail(baton.ready.reject);
				}
				return baton.ready;
			}

			baton.ready.resolve();

			return baton.ready;
		}

		function goToPage(pageNum) {
			var pages = self.pages();

			if (pageNum >= length) {
				self.close();
				return;
			}

			if (pageNum < 0) {
				return;
			}

			if (self.currentPage) {
				callMethod(self.currentPage, 'leave', self.index);
			}

			self.previousPage = (pageNum > 1) ? pages[pageNum - 1] : null;
			self.nextPage = ((pageNum + 1) < length) ? pages[pageNum + 1] : null;
			self.currentPage = pages[pageNum];
			self.index = pageNum;
			self.dialog.busy();
			triggerLoad(self.currentPage).done(function () {
				this.getBody().find(".wizard-page").detach();
				if (!pages[self.index]) {
					var $div = $('<div class="wizard-page"></div>');
					self.currentPage.draw.apply($div, getBaton(self.index));
					pages[self.index] = $div;
				}
				this.getBody().append(pages[self.index]);
				self.dialog.idle();
				callMethod(self.currentPage, 'show', self.index);

				// hide and show buttons as needed
				if (self.previousPage) {
					self.navButtons.find(".prev").show();
				} else {
					self.navButtons.find(".prev").hide();
				}

				if (self.nextPage) {
					self.navButtons.find(".next").show();
					self.navButtons.find(".done").hide();
				} else {
					self.navButtons.find(".next").hide();
					self.navButtons.find(".done").show();
				}

				if (self.currentPage.metadata("hideButtons")) {
					self.navButtons.find("button").hide();
				}

				self.updateButtonState();

			}).fail(function (resp) {
				require("io.ox/core/notifications").yell(resp);
				self.close();
			});

			setTimeout(function () {
				if (self.nextPage) {
					triggerPreLoad(self.nextPage, self.index + 1);
				}

				if (self.previousPage) {
					triggerPreLoad(self.previousPage, self.index - 1);
				}
			}, 0);

		}

		this.updateButtonState = function () {
			var baton = getBaton();
			if (baton.buttons.nextEnabled) {
				if (!nextEnabled) {
					nextEnabled = true;
					this.navButtons.find(".next").removeClass("btn-disabled");
					this.navButtons.find(".done").removeClass("btn-disabled");
				}
			} else {
				if (nextEnabled) {
					nextEnabled = false;
					this.navButtons.find(".next").addClass("btn-disabled");
					this.navButtons.find(".done").addClass("btn-disabled");
				}
			}
		};

		this.point = function () {
			return ext.point(options.id);
		};

		this.titles = function () {
			var titles = [];

			_(this.pages()).each(function (page) {
				titles.push(page.metadata("title"));
			});
		};

		this.pages = function () {
			return this.point().list();
		};

		this.start = function (options) {
			if (state !== 'stopped') {
				console.error("Cannot start wizard, when it is in state: ", state);
				return;
			}
			this.runOptions = options;
			goToPage(0);
			this.dialog.show();
		};

		this.next = function () {
			if (!nextEnabled) {
				return;
			}
			var def = null;
			if (this.currentPage) {
				def = callMethod(this.currentPage, 'finish', this.index);
				if (!def) {
					def = $.when();
				}
			}
			this.dialog.busy();
			def.done(function () {
				this.dialog.idle();
				goToPage(this.index + 1);
			});
		};

		this.done = function () {
			if (!nextEnabled) {
				return;
			}
			var def = null;
			if (this.currentPage) {
				def = callMethod(this.currentPage, 'finish', this.index);
				if (!def) {
					def = $.when();
				}
			}
			this.dialog.busy();
			def.done(function () {
				this.dialog.idle();
				this.close();
			});
		};

		this.back = function () {
			goToPage(this.index - 1);
		};

		this.close = function () {
			if (state === 'done') {
				return;
			}
			state = 'done';
			this.dialog.close();
		};

	}


	return {
		getWizard: function (options) {
			return new Wizard(options);
		}
	};
});