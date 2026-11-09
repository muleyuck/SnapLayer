# HTML preview disclosure for the Chrome Web Store

## Description text

SnapLayer overlays JPEG, PNG, SVG and single-file HTML design mockups on the current page. Resize an HTML preview's viewport to compare responsive layouts, and scroll within the mockup. Clipboard paste supports images and SVG source; HTML is imported through the file picker.

Imported HTML can run scripts and load HTTPS resources from servers referenced by the mockup. Those servers receive resource requests, and scripts can read and transmit the mockup's content and information entered inside it. SnapLayer processes imported files locally and does not upload them to a developer-operated server. Images and controls are inserted into the comparison page; the page's scripts can inspect image overlay data. HTML content is rendered in an isolated frame.

Privacy policy: https://github.com/muleyuck/SnapLayer/blob/main/PRIVACY.md

## Privacy policy URL

https://github.com/muleyuck/SnapLayer/blob/main/PRIVACY.md

## Remote code justification

User-selected HTML design mockups can require inline and HTTPS scripts to render their visual design. These scripts execute only in isolated sandboxed frames without extension API access or direct access to the comparison page's DOM. SnapLayer's own extension logic is packaged with the extension. Resources and connections are specified by the imported mockup, not a developer-operated code or analytics service.

## Update disclosure text

SnapLayer now supports HTML mockups in addition to image overlays. HTML mockups can execute scripts and connect to HTTPS servers specified by the mockup. Those scripts can transmit the mockup's content and information entered inside it. Review HTML and its referenced resources before importing it. SnapLayer does not upload files to its own server. See the privacy policy for details.

## Publication status

These texts and the privacy policy must be published with the HTML-supporting release. They are not automatically synchronized to the Chrome Web Store. Update the store description, privacy policy URL, remote-code declaration and data-use disclosures to match the release. Existing users also need a prominent disclosure of changed data practices; preparing this text alone does not deliver that disclosure.
