/*******************************************************************************************
 * Previewbox
 *
 * Copyright (C) 2013 Fischer Liu | MIT license | https://github.com/Fischer-L/previewbox
 *******************************************************************************************/
var previewbox = (function () {
/*	Properties:
		[ Private ]
		> _CONST = an obj holding the constants
		> _settings = an obj holding the settins on the preview box. The preview box would work based on these settings dyamically.
		> _previewbox = an obj, the preview box
	Methods:
		[ Private ]
		> _getIEVersion = function () : Get the IE version
		> _normalizeEvent = function (e) : Cope with the cross browser compatibility on the event object 
		> _addEvent = function (elem, evt, eHandle) : Do the same thing as addEventListener and mitigate the IE8 compatibility
		> _rmEvent = function (elem, evt, eHandle) : Do the same thing as removeEventListener and mitigate the IE8 compatibility
		> _isMouseOut = function (leaveFor, anchor) : Check if the mouse is on the previewbox or the anchor <a> element or not
		> _isHref = function (href) : Check for the valid href value
		> _getWindowWH = function () : Get the client window width and height
		> _getPreviewBoxWH = function () : Get the preview box total width and height(including the border and padding)
		> _setStyle = function (mousePosX, mousePosY) : Set up the preview box style for showing up
		> _showBox = function (href, mousePosX, mousePosY) : Show the preview box
		> _hideBox = function () : Hide the preview box
		> _mkPrviewBox = function (div) : Make one preview box
		> _mkPreviewAnchor = function (a) : Make one preview anchor
		> _prepPreview = function () : Prepare(Initial) the preview box
		[ Public ]
		> setSandbox : function (v) : Set the value of the sandbox on the preview iframe. This will overwrite the original value.
		> rmSandbox : function () : Remvoe the sandbox on the preview iframe
		> changeStyles : function (styles) : To change the preview box's style
		> regisAnchor : function (a) : To convert one <a> element into the preview anchor and register it so the preview happens when moving mouse on the <a>
		> regisBySearching : function () : To search all the <a> elements with the CSS class, "previewbox-anchor", in the docuemnt and register the findings
*/
		var _CONST = {
			boxID : "previewbox",
			anchorClass : "previewbox-anchor",
			fallbackWindowW : 1024,
			fallbackWindowH : 768,
			windowWidth : 0, // Define later. Would be this.fallbackWindowW when unable to get the client window info
			windowHeight : 0, // Define later. Would be this.fallbackWindowW when unable to get the client window info
			windowPadding : 15, // The min space (in px) between the preview box and the window top/bottom
			iframeMaxW : 0, // Define later. Shall be the window width * 0.45
			iframeMaxH : 0, // Define later. Shall be the window height * 0.7
			iframeMinW : 1024 * 0.45 * 0.6,
			iframeMinH : 768 * 0.7 * 0.6,
			boxBorderW : 4,
			boxPaddingW : 4,
			box2PtrPadding : 15, // The min space between the preview box's pointer and the preview box top/bottom
			ptrBorderTopW : 5,
			ptrBorderLeftW : 16,
			dequeue : "dequeue",
			validProtocols : ["//", "http://", "https://"]
		};
		var _settings = {			
			iframeW : 0, // The #previewbox-iframe width
			iframeH : 0, // The #previewbox-iframe height
			boxBorderColor : "#333", // The border color of the preview box(affecting #previewbox, #previewbox-pointer and #previewbox > h5)
			loadingImg : "" // The backgournd image used when loading
		};
		/*	Properties:
				[ Private ]
				> _previewbox_queueOnmouseout = an array of functions to call on the onmouseout event.
				[ Public ]
				> h5 = _previewbox.querySelector("h5");
				> carpet = _previewbox.querySelector("#previewbox-carpet");
				> iframe = _previewbox.querySelector("#previewbox-iframe");
				> pointer = _previewbox.querySelector("#previewbox-pointer");
			Methods:
				[ Private ]
				> _previewbox_runQueue = function () : Invoke the functions in this::_previewbox_queueOnmouseout one by one
				[ Public ]
				> queueOnmouseout = function (func) : Push one functions into this::_previewbox_queueOnmouseout
			Note:
				The _previewbox obj would be made during the intialization stage. Here just temporarily use null.
		*/
		var _previewbox = null;
		/*	Return:
				@ Is IE: <NUM> the version of IE
				@ Not IE: null
		*/
		var _getIEVersion = function () {
			var rv = -1; // Return value assumes failure.
			if (navigator.appName == 'Microsoft Internet Explorer') {
			  var ua = navigator.userAgent;
			  var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
			  if (re.exec(ua) != null)
				 rv = +(RegExp.$1);
			}
			return (rv === -1) ? null : rv;
		}
		/*	Arg: 
				> e = the event object
			Return:
				> The normalized event
		*/
		var _normalizeEvent = function (e) {
			// Cope with the cross browser compatibility
			e = e || window.event;
			e.target = e.target || e.srcElement;
			return e;
		}
		/*	Arg:
				> elem = the element to which the event is added
				> evt = The event string excluding "on"
				> eHandle = the event handle
		*/
		var _addEvent = function (elem, evt, eHandle) {
			if (elem.addEventListener) {
				elem.addEventListener(evt, eHandle);
			} else if (elem.attachEvent) { // The IE 8 case
				elem.attachEvent("on" + evt, eHandle);
			}
		}
		/*	Arg:
				> elem = the element to which the event is added
				> evt = The event string excluding "on"
				> eHandle = the event handle
		*/
		var _rmEvent = function (elem, evt, eHandle) {
			if (elem.removeEventListener) {
				elem.removeEventListener(evt, eHandle);
			} else if (elem.detachEvent) { // The IE 8 case
				elem.detachEvent("on" + evt, eHandle);
			}
		}
		/*	Arg:
				> leaveFor = the toElement or e.relatedTarget of the onmouseout event, meaning the element for which the mouse leaves
				> anchor = the <a> element calling this::_showBox
			Return:
				@ The mouse is still on the previewbox or the anchor <a> element: false
				@ The mouse is not on the previewbox or the anchor <a> element: true
		*/
		var _isMouseOut = function (leaveFor, anchor) {
			return !(leaveFor === _previewbox
					|| leaveFor === _previewbox.h5
					|| leaveFor === _previewbox.carpet
					|| leaveFor === _previewbox.iframe
					|| leaveFor === _previewbox.pointer
					|| (typeof anchor == "object" && leaveFor === anchor));
		}
		/*	Arg:
				> href = the href to check
			Return:
				@ OK: true
				@ NG: false
		*/
		var _isHref = function (href) {
			var is = false;
			if (href && typeof href == "string") {
				href = href.toLowerCase();
				for (var i = 0; i < _CONST.validProtocols.length; i++) {
					if (href.indexOf(_CONST.validProtocols[i]) == 0) {
						is = true;
						break;
					}
				}
			}
			return is;
		}
		/*	Return: {
				windowWidth : the width of the client window in px. If uable to find, then -1.
				windowHeight : the height of the client window in px. If uable to find, then -1.
			}
		*/
		var _getWindowWH = function () {
			if(window.innerWidth) {
				return {windowWidth : window.innerWidth, windowHeight: window.innerHeight};
			} else if(document.documentElement.clientHeight) {
				return {windowWidth : document.documentElement.clientWidth, windowHeight : document.documentElement.clientHeight};
			} else if(document.body.clientHeight) {
				return {windowWidth : document.body.clientHeight, windowHeight : document.body.clientHeight};
			} else {
				return {windowWidth : -1, windowHeight: -1};
			}
		}
		/*	Return: {
				windowWidth : the total width of the preview box in px.
				windowHeight : the height of the preview box in px.
			}
		*/
		var _getPreviewBoxWH = function () {
			return {
				width : _settings.iframeW + _CONST.boxBorderW * 2 + _CONST.boxPaddingW * 2,
				height : _settings.iframeH + _CONST.boxBorderW * 2 + _CONST.boxPaddingW * 2
			};
		}
		/*	Arg:
				> mousePosX = the horizontal coordinate (according to the client area) of the mouse pointer
				> mousePosY = the vertical coordinate (according to the client area) of the mouse pointer 
		*/
		var _setStyle = function (mousePosX, mousePosY) {
			var bTop,
				pTop,
				bSize = _getPreviewBoxWH();
			
			_previewbox.style.borderColor = _previewbox.pointer.style.borderColor = _previewbox.h5.style.color = _settings.boxBorderColor;
			_previewbox.style.backgroundImage = _settings.loadingImg;
			
			if (_CONST.windowHeight - mousePosY > bSize.height) {
			// The room in the window bottom is enough for the whole box
				bTop = mousePosY - _CONST.windowPadding * 2;
			} else {
				bTop = (_CONST.windowHeight - bSize.height - _CONST.windowPadding);
			}			
			_previewbox.style.top = bTop + "px";
			
			pTop = mousePosY - bTop - _CONST.boxBorderW - _CONST.boxPaddingW + _CONST.ptrBorderTopW;
			if (pTop < _CONST.box2PtrPadding - _CONST.boxBorderW - _CONST.boxPaddingW) {
			// The preview box pointer's top value is less than the min limit
				pTop = _CONST.box2PtrPadding;
			} else if (pTop > bSize.height - _CONST.box2PtrPadding - _CONST.boxBorderW - _CONST.boxPaddingW) {
			// The preview box pointer's top value is more than the max limit
				pTop = bSize.height - _CONST.box2PtrPadding;
			}
			_previewbox.pointer.style.top = pTop + "px";
			
			if (mousePosX < _CONST.windowWidth / 2) {
			// The mouse is at the left half side of the window
				_previewbox.style.left = (mousePosX + 25) + "px";
				_previewbox.pointer.style.borderTopColor = "transparent";
				_previewbox.pointer.style.borderBottomColor = "transparent";
				_previewbox.pointer.style.borderLeftColor = "transparent";
				_previewbox.pointer.style.left = -(2 * _CONST.ptrBorderLeftW + _CONST.boxBorderW - 1) + "px";
				_previewbox.pointer.style.right = "";
				
			} else {
			// The mouse is at the right half side of the window
				_previewbox.style.left = (mousePosX - _settings.iframeW -25) + "px";
				_previewbox.pointer.style.borderTopColor = "transparent";
				_previewbox.pointer.style.borderBottomColor = "transparent";
				_previewbox.pointer.style.borderRightColor = "transparent";
				_previewbox.pointer.style.left = "";
				_previewbox.pointer.style.right = -(2 * _CONST.ptrBorderLeftW + _CONST.boxBorderW - 1) + "px";
			}
			
			_previewbox.carpet.style.width = (_settings.iframeW + 2 * _CONST.boxPaddingW + 2 * _CONST.boxBorderW + 4 * _CONST.ptrBorderLeftW) + "px";
			_previewbox.carpet.style.height = (_settings.iframeH + 2 * _CONST.boxPaddingW + 2 * _CONST.boxBorderW + 4 * _CONST.ptrBorderLeftW) + "px";
		}		
		/*	Arg:
				> herf = the href to the preview content
				> mousePosX = refer to this::_setPos
				> mousePosY = refer to this::_setPos
		*/
		var _showBox = function (href, mousePosX, mousePosY) {
			_setStyle(mousePosX, mousePosY);
			_previewbox.iframe.src = href;
			_previewbox.iframe.style.width = _settings.iframeW + "px";
			_previewbox.iframe.style.height = _settings.iframeH + "px";
			_previewbox.style.display = "block";
		}
		/*
		*/
		var _hideBox = function () {
			_previewbox.iframe.src = "";
			_previewbox.display = "none";
			_previewbox.style.top = "10000px";
			_previewbox.style.left = "10000px";
		}
		/*	Arg:
				> div = one <div> element to be converted into the preview box
			Return:
				Refer to this::_previewbox
		*/
		var _mkPrviewBox = function (div) {
			div.id = _CONST.boxID;
			div.style.display = "none";
			div.style.border = _CONST.boxBorderW + 'px solid ' + _settings.boxBorderColor;
			div.style.padding = _CONST.boxPaddingW + "px";
			div.style.backgroundColor = "#fff";
			div.style.backgroundImage = _settings.loadingImg;
			div.style.backgroundPosition = "center center";
			div.style.backgroundRepeat = "no-repeat";
			div.style.position = "fixed";
			div.style.top = "-10000px";
			div.style.left = "-10000px";
			div.style.zIndex = 9999999999999;
			div.innerHTML = '<div id="previewbox-carpet" style="position:absolute;'
							+									'z-index:1;'
							+									'top:' + -(2 * _CONST.ptrBorderLeftW) + "px;"/*- (the total width border of the #previewbox-pointer)*/
							+									'left:' + -(2 * _CONST.ptrBorderLeftW) + "px;"/*- (the total width border of the #previewbox-pointer)*/
																/* width: the total width of the box + 2 * the total width of the #previewbox-pointer;
							                                       height: the total height of the box + 2 * the total width of the #previewbox-pointer;
																*/
							+'">'
							+'</div>'
							+'<div id="previewbox-pointer" style="border: 20px solid ' + _settings.boxBorderColor + ';'
							+									'border-width: ' + _CONST.ptrBorderTopW + 'px ' + _CONST.ptrBorderLeftW + 'px;'
							+									'position:absolute;'
							+									'z-index:2;'
																/* top: refer to this::_setStyle
																*/
																/* when at the left of the box
																   border-left-color: transparent;
																   left: - (The total width of this + the left border of the box - 1);
																*/
																/* when at the right of the box
																   border-right-color: transparent;
																   right: - (The total width of this + the right border of the box -1);
																*/
							+									'">'
						    +'</div>'
						    +'<iframe id="previewbox-iframe" frameborder="0" sandbox="allow-scripts" style="border: none; position:relative; z-index:3"></iframe>'
						    +'<h5 style="margin: 0;'
							+	        'color: ' + _settings.boxBorderColor + ';'
							+	   	    'position:absolute;'
							+			'z-index:4;'
							+	        'top:0px;'
							+	        'left:2px;'
							+	        'font-size:1em;'
							+	        'background-color: #fff;">Preview</h5>';
			_previewbox = div;
			_previewbox.h5 = _previewbox.querySelector("h5");
			_previewbox.carpet = _previewbox.querySelector("#previewbox-carpet");
			_previewbox.iframe = _previewbox.querySelector("#previewbox-iframe");
			_previewbox.pointer = _previewbox.querySelector("#previewbox-pointer");
			
			var _previewbox_queueOnmouseout = [];
			var _previewbox_runQueue = function (e) {
				e = _normalizeEvent(e);
				var i,
					q = _previewbox_queueOnmouseout;

				_previewbox_queueOnmouseout = [];
				for (i = 0; i < q.length; i++) {
					if (typeof q[i] == "function") {
						if (q[i](e) !== _CONST.dequeue) {
							_previewbox_queueOnmouseout.push(q[i]);
						}
					}
				}
			}
			/*	Arg:
					> func = One function, shall implement the below interface:
						     * Arg:
								 > e = the event obj for the onmouse event
							 * Return:
								 @ Want to be remove from the queue: this::_CONST.dequeue
								 @ Not wnat to be remove from the queue: any different from this::_CONST.dequeue
			*/
			_previewbox.queueOnmouseout = function (func) {
				if (typeof func === "function") {
					_previewbox_queueOnmouseout.push(func);
				}
			}
			
			if (_getIEVersion() == 8) {
				_addEvent(_previewbox, "mouseleave", _previewbox_runQueue);
			} else {
				_addEvent(_previewbox, "mouseout", _previewbox_runQueue);
			}
			_addEvent(_previewbox, "load", function () {
				_previewbox.style.backgroundImage = "";
			});
			return _previewbox;
		}
		/*	Arg:
				> a = one <a> element to be converted into the preview anchor
			Return:
				@ OK: The preview anchor with some new features:
					* Properties:
						[ Private ]
						> _a_queued = a boolean flag to mark the queue state
						> _a_handlesOnmouseover = an array of the event handlers on the onmouseover event
						> _a_handlesOnmouseout = an array of the event handlers on the onmouseout event
						[ Public ]
						> anchorType = a number indicating the type of anchor, current only 0 is defined. We use this property to know whether one <a> element had been registered before and know its type (Maybe in the future we will have different featured anchors).
					* Methods:
						[ Private ]
						> _a_callShowBox = function (e) : Call the _showBox to work
						> _a_callHideBox = function (e) : Call the _hideBox to work
						[ Public ]
		*/
		var _mkPreviewAnchor = function (a) {
			if (!(a.anchorType >= 0)
				|| !(typeof a.anchorType == "number")
			) {
				var _a_queued = false;
				var _a_callShowBox = function (e) {
					e = _normalizeEvent(e);
					// This is important. It prevents the preview box from being redrawn repeatedly while onmouseover
					_rmEvent(a, "mouseover", _a_callShowBox);
					if (_isHref(e.target.href)) {
						_showBox(e.target.href, e.clientX, e.clientY);
					}
				}
				/*
				*/
				var _a_callHideBox = function (e) {
					e = _normalizeEvent(e);
					var anchor = e.target;
						leaveFor = e.toElement || e.relatedTarget;
					if (_isMouseOut(leaveFor, anchor)) {
					// Now the mouse is not moving on the prview box or the <a> element
						_addEvent(a, "mouseover", _a_callShowBox);
						_hideBox();
						
					} else {
					// Now the mouse is moving onto the preview box.
					// Not hide the preview box until the mouse leaves the preview box or the <a> element.
						if (!_a_queued) {
							_a_queued = true;
							_previewbox.queueOnmouseout(function (e) {
								var leaveFor = e.toElement || e.relatedTarget;
								if (_isMouseOut(leaveFor, anchor)) {
									_addEvent(a, "mouseover", _a_callShowBox);
									_hideBox();
									_a_queued = false;
									// Once the mouse leaves, the queue is no longer needed. Let's dqueue!
									return _CONST.dequeue;
								}
							});
						}
					}
				}
				
				a.anchorType = 0;
				
				_addEvent(a, "mouseover", _a_callShowBox);
				if (_getIEVersion() == 8) {
					_addEvent(a, "mouseleave", _a_callHideBox);
				} else {
					_addEvent(a, "mouseout", _a_callHideBox);
				}
			}
			return a;
		}
		/*
		*/
		var _prepPreview = function () {
			// Append the preview box into the document if without one
			var box = document.querySelector("div#" +　_CONST.boxID);
			if (!box) {
				_previewbox = _mkPrviewBox(document.createElement("DIV"));
				document.body.appendChild(_previewbox);
			} else {
				_previewbox = _mkPrviewBox(box);
			}

			// Let's define some constants
			var c = _getWindowWH();
			_CONST.windowWidth = (c.windowWidth > 0) ? c.windowWidth : _CONST.fallbackWindowW;
			_CONST.windowHeight = (c.windowHeight > 0) ? c.windowHeight : _CONST.fallbackWindowH;
			_CONST.iframeMaxW = _CONST.windowWidth * 0.45;
			_CONST.iframeMaxH = _CONST.windowHeight * 0.7;
			publicProps.changeStyles({
				iframeW : _CONST.iframeMaxW,
				iframeH : _CONST.iframeMaxH
			});

			// Search all the <a> elems with our special class and then register all the findings
			publicProps.regisBySearching();
		}

		var publicProps = {
			/*	Arg:
					> v = string, the sandbox value, refe to the HTML5 sandbox spec
				Return:
					> The current sandbox value
			*/
			setSandbox : function (v) {
				if (typeof v == "string") {
					_previewbox.iframe.setAttribute("sandbox", v);
				}
				return _previewbox.iframe.getAttribute("sandbox");
			},
			/*
			*/
			rmSandbox : function () {
				_previewbox.iframe.removeAttribute("sandbox");
			},
			/*	Arg:
					> styles = {
						iframeW : number, the width(in px) of the iframe for the preview page. Cannot be over the client window width * 0.45 and below the client window width * 0.45 * 0.6
						iframeH : number, the height(in px) of the iframe for the preview page. Cannot be over the client window height * 0.7 and below the client window height * 0.7 * 0.6
						boxBorderColor : CSS color value, the color the preview box's border
						loadingImg : the image to display in the backgournd center of the preview box while loading, refer to CSS background-image for the correct value
					}
				Return:
					@ NG: null
					@ OK: one object carrying the current style values.
					      For exemple, suppoe set the boxBorderColor as #777 and the iframeW as 500, when setting is done,
						  it will return {
							iframeW : 500,
							boxBorderColor : "#777"
						  }
			*/
			changeStyles : function (styles) {
				var newStyles = null;			
				if (styles instanceof Object) {
				
					if (typeof styles.iframeW == "number") {
						newStyles = (newStyles instanceof Object) ? newStyles : {};
						if (_CONST.iframeMinW <= styles.iframeW && styles.iframeW <= _CONST.iframeMaxW) {
							_settings.iframeW = styles.iframeW;
						} else if (styles.iframeW < _CONST.iframeMinW) {
							_settings.iframeW = _CONST.iframeMinW;
						} else if (styles.iframeW > _CONST.iframeMaxW) {
							_settings.iframeW = _CONST.iframeMaxW
						}
						newStyles.iframeW = _settings.iframeW;
					}
					
					if (typeof styles.iframeH == "number") {
						newStyles = (newStyles instanceof Object) ? newStyles : {};
						if (_CONST.iframeMinH <= styles.iframeH && styles.iframeH <= _CONST.iframeMaxH) {
							_settings.iframeH = styles.iframeH;
						} else if (styles.iframeH < _CONST.iframeMinH) {
							_settings.iframeH = _CONST.iframeMinH;
						} else if (styles.iframeH > _CONST.iframeMaxH) {
							_settings.iframeH = _CONST.iframeMaxH
						}
						newStyles.iframeH = _settings.iframeH;
					}
					
					if(typeof styles.boxBorderColor == "string" && styles.boxBorderColor) {
						newStyles = (newStyles instanceof Object) ? newStyles : {};
						newStyles.boxBorderColor = _settings.boxBorderColor = styles.boxBorderColor;
					}
					
					if(typeof styles.loadingImg == "string" && styles.loadingImg) {
						newStyles = (newStyles instanceof Object) ? newStyles : {};
						newStyles.loadingImg = _settings.loadingImg = styles.loadingImg;
					}
				}
				return newStyles;
			},
			/*	Arg:
					> a = the <a> element to register
				Return:
					@ OK: the <a> element with an extra method called .
						  the method, 
					@ NG: null
			*/
			regisAnchor : function (a) {
				if (a
					&& typeof a == "object"
					&& a.nodeType === 1
					&& a.tagName === "A"
				) {					
					var className = " " + a.className + " ",
						reg = new RegExp(" " + _CONST.anchorClass + " ");
					
					// If the <a> has no our special class, then add...
					if (!reg.test(className)) {
						a.className += " " + _CONST.anchorClass;
					}
					
					return _mkPreviewAnchor(a); 
				}
				return null;
			},
			/*	Return:
					@ Find: the nodeList of the <a>s are registered and become the preview anchor
					@ Find nothing: null
			*/
			regisBySearching : function () {
				var i,
					as = document.querySelectorAll("a." + _CONST.anchorClass);
				for (i = 0; i < as.length; i++) {
					_mkPreviewAnchor(as[i]);
				}
				return (as.length > 0) ? as : null;
			}
		};

		_prepPreview();

		return publicProps;
}());