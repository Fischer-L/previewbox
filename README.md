## What is previewbox ?
The prviewbox is written in Javascript and lightweight and simple to use. It enables users to preview the content of a link in an sandboxed floating iFrame window while hovering mouse on the link.
As a result, the previewbox gives users a quick access to/look at the content of another page without clicking the href link to open another page in the current window or in an new window.
Try it here => http://jsfiddle.net/Fischer/4AfaC/

## No need of any extra lib/framework
The previewbox has no dependencies on other libs or frameworks.


## How to use
Simply add one more CSS class selector, "previewbox-anchor", to the HTML a element on which you want to enable the preview funciton.

And then, tell the global previewbox object that there is one HTML a element(preview anchor) you want to enable the preview funciton on.(Below we will call this action as "register anchor").

There are totally 3 ways to register anchors in the previewbox.

(1) Automatically register on the previewbox script loaded:
When the previewbox script is loaded, it will automatically search all the HTML a elements with the CSS class, "previewbox-anchor", in the docuemnt and register the findings.

(2) Manually register when needed:
Pass the HTML a element to the previewbox and make a registration manually(We will demonstrate this below).

(3) Half-auto register:
Simply ask the previewbox to search all the HTML a elements with the CSS class, "previewbox-anchor", in the docuemnt and register the findings(We will demonstrate this below).

You can defer the setting of the href value latter because the previewbox determines the preview href in the moment of mouse hovering not in the moment of registering.


## Illustration
== Load the script ==

Put 
```html
<script src="YOUR_PATH/previewbox.js"></script>
```
in the bottom of the document or load it on the document load.
The principle is to load the previewbox.js as near as the timing of the document load.


== Auto registering on the script loaded ==

Suppose in the HTML document,
```html
<a id="FOO" class="previewbox-anchor" src="//www.foo.com">FOO</a>
<a id="BAR" src="//www.bar.com">BAR</a>
```
When the preivew box script is loaded, it will search and register all the HTML a elements with the CSS class, "previewbox-anchor".
Therefore the a#FOO(www.foo.com) will be registered and the a#BAR(www.bar.com) will not.


== Manually register ==

There is a global object, previewbox, representing the preview box.
Call
```javascript
previewbox.regisAnchor(document.querySelector("a#BAR"));
```
After calling, the a#BAR would be registered and then the preview box would appear for it while moving the mouse onto it.
Then a#BAR would become
```html
<a id="BAR" class="previewbox-anchor" src="//www.bar.com">BAR</a>
```

	
== Half-auto register ==

Suppose one new HTML a is created with the class, "previewbox-anchor", and inserted into the document, so there are
```html
<a id="FOO" class="previewbox-anchor" src="//www.foo.com">FOO</a>
<a id="BAR" class="previewbox-anchor" src="//www.bar.com">BAR</a>
<a id="CGG" class="previewbox-anchor" src="http//www.cgg.com">CGG</a>
```
The a#CGG is still not registered although it carrys the "previewbox-anchor" class because the preview box doesn't know its join.
Call
```javascript
previewbox.regisBySearching();
```
After calling, the preview box searchs and registers all the HTML a elements with the CSS class, "previewbox-anchor".
Then the a#CGG would be registered like the a#FOO and the a#BAR.


== Change the style ==

Call previewbox.changeStyles to alter the style of the preview box.
The styles of the preview box is calculated so that it appears in the right shape. If understand the source codes, please modify as your wish or please use the changeStyles method to alter the styles.


## Security
- For the security reason, the X-Frame-Options header from the content to preview affects that the iframe loads the preview content. For more details, please visit https://developer.mozilla.org/en-US/docs/HTTP/X-Frame-Options

- The HTML5 sandbox. The preview box's iframe utilizes the HTML5 sandbox feature to secure the iframe.
  Please use previewbox.setSandbox and previewbox.rmSandbox to config the sandbox.
  If the browser does not support the HTML5 sandbox, it would have no sandbox security effect, however, the preview feature would still exists.

- Watch out the preview content you are looking at. Please make sure the link is clean and safe. This is one of the basic and the most effective way to load outside contents securely.


