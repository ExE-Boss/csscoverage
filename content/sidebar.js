/* jshint browser: true */
/* globals Components, Services, RuleStore, XPCOMUtils */
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://csscoverage/content/RuleStore.jsm');

let strings = Services.strings.createBundle('chrome://csscoverage/locale/csscoverage.properties');
document.getElementById('scanPage').textContent = strings.GetStringFromName('sidebar.scanpagebutton.label');

function loadAndFillLists() {
	let rules = RuleStore.getAllRules();
	let hrefs = Array.from(rules.keys()).sort();
	for (let href of hrefs) {
		if (href === null) {
			continue;
		}

		let data = rules.get(href);
		// if (!data.unused.length) {
		// 	continue;
		// }

		let { p, ul } = findList(href);
		p.textContent =	strings.formatStringFromName('sidebar.sheet.stats', [
			data.locations.size, data.used.length, data.unused.length
		], 3);

		while (ul.lastChild) {
			ul.lastChild.remove();
		}
		let previousMedia = null;
		for (let selector of data.unused) {
			let li = document.createElement('li');
			if (previousMedia != selector.media) {
				if (previousMedia) {
					ul = ul.parentNode.parentNode;
				}
				if (selector.media) {
					li.textContent = '@media ' + selector.media;
					li.classList.add('collapsible');
					li.onclick = function(event) {
						if (event.target == this) {
							this.classList.toggle('collapsed');
						}
					};
					ul.appendChild(li);
					ul = document.createElement('ul');
					li.appendChild(ul);
					li = document.createElement('li');
				}
				previousMedia = selector.media;
			}
			li.textContent = selector.line + ':' /*+ selector.column*/ + ' ' + selector.selectorText;
			ul.appendChild(li);
		}
	}
}

loadAndFillLists();

function findList(href) {
	for (let h of document.querySelectorAll('h1')) {
		if (h.getAttribute('title') == href) {
			return {
				h1: h,
				p: h.nextElementSibling,
				ul: h.nextElementSibling.nextElementSibling
			};
		}
	}

	let h1 = document.createElement('h1');
	h1.classList.add('collapsible');
	h1.setAttribute('title', href);
	h1.textContent = href.substring(href.lastIndexOf('/') + 1);
	h1.onclick = function() {
		this.classList.toggle('collapsed');
	};
	let button = document.createElement('button');
	button.textContent = strings.GetStringFromName('sidebar.sheet.forgetbutton.label');
	button.onclick = function() {
		RuleStore.forget(href);
		h1.remove();
		p.remove();
		ul.remove();
	};
	h1.appendChild(button);
	document.body.appendChild(h1);

	let p = document.createElement('p');
	document.body.appendChild(p);

	let ul = document.createElement('ul');
	document.body.appendChild(ul);
	return { h1, p, ul };
}

let observer = {
	QueryInterface: XPCOMUtils.generateQI([
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsISupports
	]),

	observe: function() {
		loadAndFillLists();
	}
};

Services.obs.addObserver(observer, 'CSSCoverage:rulesAdded', true);

function getTopWindow() {
	return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	.getInterface(Components.interfaces.nsIWebNavigation)
	.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
	.rootTreeItem
	.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	.getInterface(Components.interfaces.nsIDOMWindow)
	.wrappedJSObject;
}

/* exported scanPage */
function scanPage() {
	getTopWindow().gBrowser.selectedBrowser.messageManager.sendAsyncMessage('CSSCoverage:scanPage');
}
