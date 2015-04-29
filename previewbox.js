/*******************************************************************************************
 * Previewbox
 *
 * Copyright (C) 2013 Fischer Liu | MIT license | https://github.com/Fischer-L/previewbox
 *******************************************************************************************/
var previewbox = (function () {
	"use strict";
/*	Properties:
		[ Private ]
		> _dbg = one debug control
		> _CONST = an obj holding the constants
		> _settings = an obj holding the settins on the preview box. The preview box would work based on these settings dyamically.
		> _previewbox = an obj, the preview box
	Methods:
		[ Private ]
		> _getIEVersion : Get the IE version
		> _normalizeEvent : Cope with the cross browser compatibility on the event object 
		> _addEvent : Do the same thing as addEventListener and mitigate the IE8 compatibility
		> _rmEvent : Do the same thing as removeEventListener and mitigate the IE8 compatibility
		> _isMouseOut : Check if the mouse is on the previewbox or the anchor <a> element or not
		> _isHref : Check for the valid href value
		> _getWindowSize : Get the client window width and height
		> _getIFrameSize : Get the iframe width and height
		> _getPreviewBoxSize : Get the preview box total width and height(including the border and padding)
		> _setStyle : Set up the preview box style for both the PC and mobile mdoe
		> _setStylePC : Set up the preview box style for showing up at the PC mode
		> _showBox : Show the preview box
		> _hideBox : Hide the preview box
		> _mkPrviewBox : Make one preview box
		> _mkPreviewAnchor : Make one preview anchor
		> _prepPreview : Prepare(Initial) the preview box
		[ Public ]
		> setSandbox : Set the value of the sandbox on the preview iframe. This will overwrite the original value.
		> rmSandbox : Remvoe the sandbox on the preview iframe
		> changeStyles : To change the preview box's style
		> regisAnchor : To convert one <a> element into the preview anchor and register it so the preview happens when moving mouse on the <a>
		> regisBySearching : To search all the <a> elements with the CSS class, "previewbox-anchor", in the docuemnt and register the findings
*/
		var
		/*	Methods:
				[ Public ]
				> isDBG : Tell if under the debug mode
				> error : Log error to console
		*/
		_dbg = (function () {
				
			return {
				/*	Return:
						@ Under the debug mode: true
						@ Not Under the debug mode: false
				*/
				isDBG : function () {
					return true;
				},
				error : function (msg) {
					console.error("previewbox error : " + msg);
				}
			}
		})(),
		//_CONST = { // To Del old
		//	validProtocols : ["//", "http://", "https://"],
		//	
		//	boxID : "previewbox",
		//	anchorClass : "previewbox-anchor",
		//	
		//	fallbackWindowW : 1024, // in px
		//	fallbackWindowH : 768, // in px
		//	
		//	boxFontSize : 16, // in px
		//	boxHiddenPosTop : "-10000px",
		//	boxHiddenPosLeft : "-10000px",
		//	
		//	// For the PC mode
		//	boxBorderW : 4, // in px
		//	iframeMaxPercW : 0.45, // The max proportion of the iframe's width could occuppy the window width
		//	iframeMinPercW : 0.45 * 0.6,
		//	iframeMaxPercH : 0.7, // The max proportion of the iframe's height could occuppy the window height
		//	iframeMinPercH : 0.7 * 0.6,
		//	windowPadding : 15, // in px; The min space between the preview box and the window top/bottom
		//	box2PtrPadding : 15, // in px; The min space between the preview box's pointer and the preview box top/bottom
		//	ptrBorderTopW : 5, // in px
		//	ptrBorderLeftW : 16, // in px
		//	
		//	// For the mobile mode
		//	mobileBarH : 16 * 3
		//	
		//	"just for ending" : undefined
		//},
		_CONST = (function (c) {
			
			c.validProtocols = ["//", "http://", "https://"];
			
			c.boxID = "previewbox"
			c.anchorClass = "previewbox-anchor";
			
			c.fallbackWindowW = 1024; // in px
			c.fallbackWindowH = 768; // in px
			
			c.boxFontSize = 16; // in px
			c.boxHiddenPosTop = "-10000px";
			c.boxHiddenPosLeft = "-10000px";
			
			// For the PC mode
			c.boxBorderW = 4; // in px
			c.iframeMaxPercW = 0.45; // The max proportion of the iframe's width could occuppy the window width
			c.iframeMinPercW = 0.45 * 0.6;
			c.iframeMaxPercH = 0.7; // The max proportion of the iframe's height could occuppy the window height
			c.iframeMinPercH = 0.7 * 0.6;
			c.windowPadding = 15; // in px; The min space between the preview box and the window top/bottom
			c.box2PtrPadding = 15; // in px; The min space between the preview box's pointer and the preview box top/bottom
			c.ptrBorderTopW = 5; // in px
			c.ptrBorderLeftW = 16; // in px
			
			// For the mobile mode
			c.mobileBoxBorderW = 6; // in px
			c.mobileBoxFontSize = c.boxFontSize * 0.9;
			c.mobileBarH = c.mobileBoxFontSize * 4;
			
			return c;
		})({}),
		_settings = {
			loadingImg : "", // The backgournd image used when loading
			boxBorderColor : "#333", // The border color of the preview box
			iframeW : _CONST.fallbackWindowW * _CONST.iframeMaxPercW, // The #previewbox-iframe wish width. The real size doesn't necessarily obey this value but will dynamically be computed based this wish value.
			iframeH : _CONST.fallbackWindowH * _CONST.iframeMaxPercH, // The #previewbox-iframe wish height
			boxPadding : 14, // The padding of the preview box(affecting #previewbox)
			boxShadow : "", // The preview box's box-shadow
			
			// For the mobile mode
			mobileBarColor : "#edeeef",
			
			"just for ending" : undefined
		},
		/*	Properties:
				[ Public ]
				<ELM> The child DOM elements, refer to this::_mkPrviewBox
			Note:
				The _previewbox obj would be made during the intialization stage. Here just temporarily use null.
		*/
		_previewbox = null,
		/*	Return:
				@ Is IE: <NUM> the version of IE
				@ Not IE: NaN
		*/
		_getIEVersion = function () {
			var rv = -1; // Return value assumes failure.
			if (navigator.appName == 'Microsoft Internet Explorer') {
			  var ua = navigator.userAgent;
			  var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
			  if (re.exec(ua) != null)
				 rv = +(RegExp.$1);
			}
			return (rv === -1) ? NaN : rv;
		},
		/*	Arg: 
				> e = the event object
			Return:
				> The normalized event
		*/
		_normalizeEvent = function (e) {
			// Cope with the cross browser compatibility
			
			if (!e) e = window.event;
			
			if (!e.target) e.target = e.srcElement || document;
			
			return e;
		},
		/*	Arg:
				> elem = the element to which the event is added
				> evt = The event string excluding "on"
				> eHandle = the event handle
		*/
		_addEvent = function (elem, evt, eHandle) {
			if (elem.addEventListener) {
				elem.addEventListener(evt, eHandle);
			} else if (elem.attachEvent) { // The IE 8 case
				elem.attachEvent("on" + evt, eHandle);
			}
		},
		/*	Arg:
				> elem = the element to which the event is added
				> evt = The event string excluding "on"
				> eHandle = the event handle
		*/
		_rmEvent = function (elem, evt, eHandle) {
			if (elem.removeEventListener) {
				elem.removeEventListener(evt, eHandle);
			} else if (elem.detachEvent) { // The IE 8 case
				elem.detachEvent("on" + evt, eHandle);
			}
		},
		/*	Arg:
				> leaveFor = the toElement or e.relatedTarget of the onmouseout event, meaning the element for which the mouse leaves
				> anchor = the <a> element calling this::_showBox
			Return:
				@ The mouse is still on the previewbox or the anchor <a> element: false
				@ The mouse is not on the previewbox or the anchor <a> element: true
		*/
		_isMouseOut = function (leaveFor, anchor) {
			var isOut = true,
				maxDepth = 3,
				depth = arguments[2] || 0;
				
			if (leaveFor) {
				isOut = !(leaveFor === _previewbox || (typeof anchor == "object" && leaveFor === anchor));
				if (depth < maxDepth && isOut) {
					depth++;
					leaveFor = leaveFor.parentNode;
					if (leaveFor) {
						return _isMouseOut(leaveFor, anchor, depth)
					}
				}
			}
			
			return isOut;
		},
		/*	Arg:
				> href = the href to check
			Return:
				@ OK: true
				@ NG: false
		*/
		_isHref = function (href) {
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
		},
		/*	Return: {
				windowWidth : the width of the client window in px. If unable to find, then -1.
				windowHeight : the height of the client window in px. If unable to find, then -1.
			}
		*/
		_getWindowSize = function () {
		
			if(window.innerWidth) {
			
				return {
					windowWidth : window.innerWidth,
					windowHeight: window.innerHeight
				};
				
			} else if (document.documentElement.offsetHeight) {
			
				return {
					windowWidth : document.documentElement.offsetWidth, 
					windowHeight : document.documentElement.offsetHeight
				};
				
			} else if (document.body.offsetHeight) {
			
				return {
					windowWidth : document.body.offsetWidth, 
					windowHeight : document.body.offsetHeight
				};
				
			} else if (document.documentElement.clientHeight) {
			
				return {
					windowWidth : document.documentElement.clientWidth, 
					windowHeight : document.documentElement.clientHeight
				};
				
			} else if (document.body.clientHeight) {
			
				return {
					windowWidth : document.body.clientWidth, 
					windowHeight : document.body.clientHeight
				};
				
			}
			
			return {
				windowWidth : -1,
				windowHeight: -1
			};
		},
		/* Return : <OBJ> {
				iframeW, iframeH : <NUM> the iframe's width/height
		   }
		*/
		_getIFrameSize = function () {
		
			var c = _getWindowSize();
			
			if (c.windowWidth > 0 || c.windowHeight > 0) {
			
				c.iMaxW = c.windowWidth * _CONST.iframeMaxPercW;
				c.iMinW = c.windowWidth * _CONST.iframeMinPercW;
				c.iMaxH = c.windowHeight * _CONST.iframeMaxPercH;
				c.iMinH = c.windowHeight * _CONST.iframeMinPercH;
				
				c.iW = (c.iMinW <= _settings.iframeW && _settings.iframeW <= c.iMaxW) ?
					   _settings.iframeW : (c.iMinW > _settings.iframeW) ?
					   c.iMinW : c.iMaxW;
				
				c.iH = (c.iMinH <= _settings.iframeH && _settings.iframeH <= c.iMaxH) ?
					   _settings.iframeH : (c.iMinH > _settings.iframeH) ?
					   c.iMinH : c.iMaxH;
			
			} else {
				c.iW = _CONST.fallbackWindowW * _CONST.iframeMaxPercW;
				c.iH = _CONST.fallbackWindowH * _CONST.iframeMaxPercH;
			}
			
			return {
				iframeW : c.iW, iframeH : c.iH
			};
		},
		/*	Return: {
				width : the total width of the preview box in px.
				height : the height of the preview box in px.
			}
		*/
		_getPreviewBoxSize = function () {
			
			var i = _getIFrameSize();
			
			return {
				width : i.iframeW + _CONST.boxBorderW * 2 + _settings.boxPadding * 2,
				height : i.iframeH + _CONST.boxBorderW * 2 + _settings.boxPadding * 2
			};
		},
		/*
		*/
		_setStyle = function () {
			
			  _previewbox.style.color
			= _previewbox.hintxt.style.color
			= _previewbox.pointer.style.borderColor
			= _previewbox.mobileBar.style.backgroundColor = _settings.boxBorderColor;
			
			_previewbox.style.backgroundImage = _settings.loadingImg;
			
			// Hide first then show later
			   _previewbox.carpet.style.display
			= _previewbox.pointer.style.display
			= _previewbox.mobileBar.style.display = "none";
			
			// Clear first then set later
			  _previewbox.hintxt.style.left
			= _previewbox.hintxt.style.right = "";
		},
		/*	Arg:
				> mousePosX = the horizontal coordinate (according to the client area) of the mouse pointer
				> mousePosY = the vertical coordinate (according to the client area) of the mouse pointer 
		*/
		_setStylePC = function (mousePosX, mousePosY) {
		
			var wSize = _getWindowSize(),
				ifSize = _getIFrameSize(),
				bSize = _getPreviewBoxSize();
			
			var v = {
					bTop : NaN,
					pTop : NaN,
					bW : bSize.width,
					bH : bSize.height,
					bBorderW : _CONST.boxBorderW,
					bPadding : _settings.boxPadding,
					ifW : ifSize.iframeW,
					ifH : ifSize.iframeH,
					fontSize : _CONST.boxFontSize,
					pWidth : 2 * _CONST.ptrBorderLeftW,
					pHozPos : -(2 * _CONST.ptrBorderLeftW + _CONST.boxBorderW - 1),
					pTopMin : _CONST.box2PtrPadding - _CONST.boxBorderW - _settings.boxPadding,
					winW : (wSize.windowWidth > 0) ? wSize.windowWidth : _CONST.fallbackWindowW,
					winH : (wSize.windowHeight > 0) ? wSize.windowHeight : _CONST.fallbackWindowH
				};
				
			if (v.winH - mousePosY > v.bH) {
			// The room in the window bottom is enough for the whole box
				v.bTop = mousePosY - _CONST.windowPadding * 2;
			} else {
				v.bTop = v.winH - v.bH - _CONST.windowPadding;
			}
			
			v.pTop = mousePosY - v.bTop - _CONST.boxBorderW - _settings.boxPadding + _CONST.ptrBorderTopW;
			if (v.pTop < v.pTopMin) {
			// The preview box pointer's top value is less than the min limit
				v.pTop = _CONST.box2PtrPadding;				
			} else if (v.pTop > v.bH - v.pTopMin) {
			// The preview box pointer's top value is more than the max limit
				v.pTop = v.bH - _CONST.box2PtrPadding;				
			}		
			
			if (_dbg.isDBG()) {
			
				for (var p in v) {
					
					if (v.hasOwnProperty(p)) {					
						if (isNaN(v[p]) || typeof v[p] != "number") _dbg.error("illegal value for setting PC mode style => " + p + " = " + v[p]);
					}
				}
			}
			
			_previewbox.style.top = v.bTop + "px";
			_previewbox.style.overflow = "visible";
			_previewbox.style.boxSize = "content-box";
			_previewbox.style.padding = v.bPadding + "px";
			_previewbox.style.borderWidth = v.bBorderW + 'px';	
			_previewbox.style.borderTopWidth = _previewbox.style.borderWidth;
			
			_previewbox.iframe.style.top = "0";
			_previewbox.iframe.style.width = v.ifW + "px";
			_previewbox.iframe.style.height = v.ifH + "px";
						
			_previewbox.carpet.style.width = (v.bW + v.pWidth) + "px";
			_previewbox.carpet.style.height = (v.bH + v.pWidth) + "px";
			
			_previewbox.hintxt.style.top = "0";
			_previewbox.hintxt.style.left = "4px";
			_previewbox.hintxt.style.fontSize = v.fontSize + 'px';
			
			_previewbox.pointer.style.top = v.pTop + "px";
			
			  _previewbox.carpet.style.display
			= _previewbox.pointer.style.display = "block";
			
			if (mousePosX < v.winW / 2) {
			// The mouse is at the left half side of the window
				_previewbox.style.left = (mousePosX + v.pWidth/2) + "px";
				_previewbox.pointer.style.left = v.pHozPos + "px";
				_previewbox.pointer.style.right = "";
				_previewbox.pointer.style.borderTopColor = "transparent";
				_previewbox.pointer.style.borderBottomColor = "transparent";
				_previewbox.pointer.style.borderLeftColor = "transparent";
				
			} else {
			// The mouse is at the right half side of the window
				_previewbox.style.left = (mousePosX - v.bW - v.pWidth/2) + "px";
				_previewbox.pointer.style.left = "";
				_previewbox.pointer.style.right = v.pHozPos + "px";
				_previewbox.pointer.style.borderTopColor = "transparent";
				_previewbox.pointer.style.borderBottomColor = "transparent";
				_previewbox.pointer.style.borderRightColor = "transparent";
			}
			
			if (_settings.boxShadow) {
				_previewbox.style.oBoxShadow = _settings.boxShadow;
				_previewbox.style.msBoxShadow = _settings.boxShadow;
				_previewbox.style.mozBoxShadow = _settings.boxShadow;
				_previewbox.style.webkitBoxShadow = _settings.boxShadow;
				_previewbox.style.boxShadow = _settings.boxShadow;
			}
		},
		/*
		*/
		_setStyleMobile = function () { // TODO
			
			var v = {
					ifTop : _CONST.mobileBarH,
					hTop : _CONST.mobileBarH + 2,
					bPadding : _settings.boxPadding / 2,
					fontSize : _CONST.mobileBoxFontSize
				};
			
			if (_dbg.isDBG()) { console.log(v.fontSize); // To Del
			
				for (var p in v) {
					
					if (v.hasOwnProperty(p)) {					
						if (isNaN(v[p]) || typeof v[p] != "number") _dbg.error("illegal value for setting mobile mode style => " + p + " = " + v[p]);
					}
				}
			}
			
			_previewbox.style.overflow = "hidden";
			_previewbox.style.boxSizing = "border-box";
			_previewbox.style.padding = v.bPadding + "px";
			_previewbox.style.borderWidth = _CONST.mobileBoxBorderW + 'px';
			_previewbox.style.borderTopWidth = "0";
			
			_previewbox.hintxt.style.right = "6px";
			_previewbox.hintxt.style.top = v.hTop + "px";
			_previewbox.hintxt.style.fontSize = v.fontSize + 'px';
			
			_previewbox.mobileBar.style.display = "block";
			
			_previewbox.iframe.style.top = v.ifTop + "px";
			
			  _previewbox.style.width
			= _previewbox.style.height
			= _previewbox.iframe.style.width
			= _previewbox.iframe.style.height = "100%";
			
			  _previewbox.style.top
			= _previewbox.style.left = "0";
		},
		/*	Arg:
				> herf = the href to the preview content
				> mousePosX = refer to this::_setPos
				> mousePosY = refer to this::_setPos
		*/
		_showBox = function (href, mousePosX, mousePosY) {
			
if (_dbg.isDBG() && 0) { // To Del

	_setStyle();
	_setStyleMobile();
	_previewbox.iframe.src = href;
	_previewbox.style.display = "block";
	return;
}	
			_setStyle();
			_setStylePC(mousePosX, mousePosY);
			_previewbox.iframe.src = href;
			_previewbox.style.display = "block";
		},
		/*
		*/
		_hideBox = function () { if (_dbg.isDBG()) return; // To Del
			_previewbox.iframe.src = "";
			_previewbox.display = "none";
			_previewbox.style.top = _CONST.boxHiddenPosTop;
			_previewbox.style.left = _CONST.boxHiddenPosLeft;
		},
		/*	Arg:
				<ELM> div = one <div> element to be converted into the preview box
			Return:
				Refer to this::_previewbox
		*/
		_mkPrviewBox = function (div) {
		
			_previewbox = div;
			
			div.id = _CONST.boxID;
			div.style.display = "none";
			// div.style.width = div.style.height = when at the mobile mode ? 100% : computed dynamically
			// div.style.padding = when at the mobile mode ? set to 50% in the PC mode dynamically : set dynamically
			// div.style.borderWidth = set dynamically based on the mobile & PC mode
			div.style.borderStyle = 'solid';
			// div.style.borderColor = set dynamically
			// div.style.borderTopWidth = when at the mobile mode ? 0 : borderWidth;
			// div.style.boxSize = when at the mobile mode ? border-box : content-box
			div.style.backgroundColor = "#fff";
			// div.style.backgroundImage = set dynamically
			div.style.backgroundPosition = "center center";
			div.style.backgroundRepeat = "no-repeat";
			// div.style.overflow = when at the mobile mode ?  hidden : visible;
			div.style.position = "fixed";
			div.style.top = _CONST.boxHiddenPosTop;
			div.style.left = _CONST.boxHiddenPosLeft;
			div.style.zIndex = 9999999999999;
			div.innerHTML = '<div id="previewbox-carpet" style="position:absolute;'
							+								   'z-index:1;'
							+								   'top:' + -(_CONST.ptrBorderLeftW) + 'px;'
							+								   'left:' + -(_CONST.ptrBorderLeftW) + 'px;'
															   // width: the total width of the box + the total width of the #previewbox-pointer;
							                                   // height: the total height of the box + the total width of the #previewbox-pointer;
															   // display: when at the mobile mode ? none : block
							+								   '"'
							+'></div>'
							+'<div id="previewbox-pointer" style="border-style: solid;'
							+									 'border-width: ' + _CONST.ptrBorderTopW + 'px ' + _CONST.ptrBorderLeftW + 'px;'
																 // border-color: set dynamically the same as the previewbox's border color
							+									 'position: absolute;'
							+									 'z-index: 2;'
																 // top: set dynamically
																 
																 // When at the left of the box
																 // border-left-color: transparent;
																 // left: - (The total width of this + the left border of the box - 1);
																 
																 // When at the right of the box
																 // border-right-color: transparent;
																 // right: - (The total width of this + the right border of the box -1);
																 
															     // display: when at the mobile mode ? none : block
							+									 '"'
							+'></div>'
						    +'<h5 id="previewbox-hintxt"' 
							+    'style="padding: 2px 4px;'
							+           'margin: 0;'
							+	        'background-color: #fff;'
							+	   	    'position: absolute;'
							+			'z-index: 4;'
										// top: when at the mobile mode ? the #previewbox-mobileBar height + 2 : 0
										// left: when at the mobile mode ? null : 6px
										// right: when at the mobile mode ? 6px : null
										// color: set dynamically the same as the previewbox's border color
										// font-size: set dynamically based on the mobile & PC mode
							+	        '"'
							+'>Preview</h5>'
							+'<div id="previewbox-mobileBar"' // TODO
							+	  'style="width: 100%;'
							+			 'height:' + _CONST.mobileBarH + 'px;'
							+			 'margin: 0;'
							+			 'line-height:' + _CONST.mobileBarH + 'px;'
							+			 'font-size:' + _CONST.mobileBoxFontSize + 'px;'
							+	         'color:' + _settings.mobileBarColor + ";"
							+	   	     'position: absolute;'
							+			 'z-index: 4;'
							+	         'top: 0;'
							+	         'left: 0;'							
										 // background-color: set dynamically the same as the previewbox's border color
										 // display: when at the mobile mode ? block : none
							+	  '"'
							+'>'
							+		'<a id="previewbox-mobileBar-targetLink"'
							+		   'href="#"' // Set to the link being previewed
							+		   'style="width: 66%;'
							+		          'margin-left:' + _CONST.mobileBoxBorderW + 'px;'
							+                 'display: inline-block;'
							+                 'overflow: hidden;'
							+                 'text-overflow: ellipsis;'
							+                 'white-space: nowrap;'
							+	              'color:' + _settings.mobileBarColor + ";"
							+		   '"'
							+		'>TODO : Set to the previewed link text</a>'
							+		'<div id="previewbox-mobileBar-closeBtn"'
							+			 'style="width: 48px;'
							+			        'height:' + _CONST.mobileBarH + 'px;'
							+			        'float: right;'
							+			        'position: relative;'
							+			 '"'
							+		'>'
							+				'<div style="border-style: solid;'
							+							'border-width: 1.6px '+ (_CONST.mobileBarH * 0.22) + 'px;'
							+							'border-radius: 2px;'
							+							'position: absolute;'
							+							'top: 50%;'
							+							'left: 50%;'
							+							'transform: translateY(-50%) translateX(-50%) rotate(45deg);'
							+							'"'
							+				'></div>'
							+				'<div style="border-style: solid;'
							+							'border-width: 1.6px '+ (_CONST.mobileBarH * 0.22) + 'px;'
							+							'border-radius: 2px;'
							+							'position: absolute;'
							+							'top: 50%;'
							+							'left: 50%;'
							+							'transform: translateY(-50%) translateX(-50%) rotate(-45deg);'
							+							'"'
							+				'></div>'
							+		'</div>'
							+'</div>'
						    +'<iframe id="previewbox-iframe" frameborder="0" sandbox="allow-scripts"'
							+        'style="border: none;'
							+				'position:relative;'
							+				'z-index:3;'
											// width/height: when at the mobile mode ? 100% : computed dynamically
											// top: when at the mobile mode ? the same as #previewbox-mobileBar height : 0
							+				'"'
							+'></iframe>';
							
			_previewbox.hintxt = _previewbox.querySelector("#previewbox-hintxt");
			_previewbox.carpet = _previewbox.querySelector("#previewbox-carpet");
			_previewbox.iframe = _previewbox.querySelector("#previewbox-iframe");
			_previewbox.pointer = _previewbox.querySelector("#previewbox-pointer");
			_previewbox.mobileBar = _previewbox.querySelector("#previewbox-mobileBar");
			_previewbox.mobileBar.targetLink = _previewbox.querySelector("#previewbox-mobileBar-targetLink");
			
			
			_addEvent(_previewbox.iframe, "load", function () {
				_previewbox.style.backgroundImage = "";
			});
			
			return _previewbox;
		},
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
						> _a_startDetectMouseOut = function (e) : Start detecting if the mouse is out of the preview box
						> _a_callShowBox = function (e) : The event listener calling the _showBox to work
						> _a_callHideBox = function (e) : The event listener calling the _hideBox to work
		*/
		_mkPreviewAnchor = function (a) {
			if (   !(a.anchorType >= 0)
				|| !(typeof a.anchorType == "number")
			) {
			
				var
				_a_startDetectMouseOut = function () {
					
					function detectOutOfBox () {
					
						function _a_detectMouseOut (e) {
						
							e = _normalizeEvent(e);

							var leaveFor = e.toElement || e.relatedTarget;

							if (_isMouseOut(leaveFor, a)) {

								// IMPORTANT: Remove and wait for the next time
								_rmEvent(_previewbox.carpet, "mouseout", _a_detectMouseOut);
								
								_addEvent(a, "mouseover", _a_callShowBox);
								_hideBox();
							}
						};
							
						_rmEvent(_previewbox.iframe, "mouseover", detectOutOfBox);
						_addEvent(_previewbox.carpet, "mouseout", _a_detectMouseOut);
					};
					
					_addEvent(_previewbox.iframe, "mouseover", detectOutOfBox);
				},
				
				_a_callShowBox = function (e) {
				
					e = _normalizeEvent(e);
					
					if (_isHref(a.href)) {
					
						// This is important. It prevents the preview box from being redrawn repeatedly while onmouseover
						_rmEvent(a, "mouseover", _a_callShowBox);
						
						_showBox(a.href, e.clientX, e.clientY);

						_a_startDetectMouseOut();
					}
				},
				
				_a_callHideBox = function (e) {
			
					e = _normalizeEvent(e);
			
					var leaveFor = e.toElement || e.relatedTarget;

					if (_isMouseOut(leaveFor, a)) {
						_addEvent(a, "mouseover", _a_callShowBox);
						_hideBox();

					}
				};
					
				a.anchorType = 0;
				
				_addEvent(a, "mouseover", _a_callShowBox);
				_addEvent(a, "mouseout", _a_callHideBox);
			}
			return a;
		},
		/*
		*/
		_prepPreview = function () {
			// Append the preview box into the document if without one
			var box = document.querySelector("div#" +　_CONST.boxID);
			if (!box) {
				_previewbox = _mkPrviewBox(document.createElement("DIV"));
				document.body.appendChild(_previewbox);
			} else {
				_previewbox = _mkPrviewBox(box);
			}

			// Search all the <a> elems with our special class and then register all the findings
			publicProps.regisBySearching();
		},
		
		publicProps = {
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
					> styles = { // The setable styles
						iframeW : number, the width(in px) of the iframe for the preview page. Cannot be over the client window width * 0.45 and below the client window width * 0.45 * 0.6
						iframeH : number, the height(in px) of the iframe for the preview page. Cannot be over the client window height * 0.7 and below the client window height * 0.7 * 0.6
						boxBorderColor : CSS color value, the color the preview box's border
						boxPadding : the number in px, the preview box's padding
						loadingImg : the image to display in the backgournd center of the preview box while loading, refer to CSS background-image for the correct value
						boxShadow : the preview box's shadow, refer to the CSS box-shadow value. If the broswer doesn't support, then no effect appears.
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
				
					if (typeof styles.iframeW == "number" && styles.iframeW > 0) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.iframeW = _settings.iframeW = styles.iframeW;
					}
					
					if (typeof styles.iframeH == "number" && styles.iframeH > 0) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.iframeH = _settings.iframeH = styles.iframeH;
					}
					
					if (typeof styles.boxBorderColor == "string" && styles.boxBorderColor) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.boxBorderColor = _settings.boxBorderColor = styles.boxBorderColor;
					}
					
					if (typeof styles.boxPadding == "number" && styles.boxPadding > 0) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.boxPadding = _settings.boxPadding = styles.boxPadding;
					}
					
					if (typeof styles.loadingImg == "string" && styles.loadingImg) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.loadingImg = _settings.loadingImg = styles.loadingImg;
					}
					
					if (typeof styles.boxShadow == "string" && styles.boxShadow) {
						
						if (!(newStyles instanceof Object)) newStyles = {};
						
						newStyles.boxShadow = _settings.boxShadow = styles.boxShadow;
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
