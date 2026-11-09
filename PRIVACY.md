# SnapLayer Privacy Policy

Last updated: November 9, 2026

SnapLayer processes content you choose so you can compare design mockups with a browser page.

## Content processed on your device

SnapLayer reads selected image and HTML files, and images or SVG source you paste into its popup. It uses that content to display an overlay in the active tab. It also uses the active tab's identifier and URL to place the overlay. SnapLayer does not include an upload server, analytics service, or advertising service, and does not send imported files to a developer-operated server.

Images and overlay controls are inserted into the comparison page. That page's scripts can inspect its DOM, including image overlay data. HTML mockup content is rendered in an isolated frame, without direct access to the comparison page's DOM or SnapLayer's extension APIs.

## Connections made by HTML mockups

Imported HTML can execute scripts and load HTTPS images, styles, scripts, and fonts. These requests go to servers referenced by the HTML or its scripts. Those servers receive normal network request information, including the requesting IP address and resource URL. Their own privacy practices apply.

Scripts in an HTML mockup can read and transmit the mockup's content and information entered inside it. The isolation boundary does not prevent those connections. Use HTML and referenced resources that you trust. SnapLayer does not choose an analytics or advertising endpoint for these requests.

## Permissions

- `activeTab`: temporarily access the tab where you invoke SnapLayer, to display the overlay.
- `scripting`: insert SnapLayer's overlay controls into that tab.

SnapLayer does not collect browsing history or send the comparison page's content to a developer-operated server.

## Storage and controls

SnapLayer does not persist imported files or overlay settings in extension storage. You can remove the preview with its delete control or close or reload the comparison tab. Hiding a layer keeps its preview loaded. Browser caching of remote resources and data retained by servers contacted by a mockup are controlled by the browser and those servers.

SnapLayer uses the content you provide only for its overlay comparison feature. SnapLayer does not sell that content, use it for advertising, or transfer it for unrelated purposes.

## Changes and contact

This policy will be updated when SnapLayer's data practices change. Questions about this policy can be submitted through the [SnapLayer issue tracker](https://github.com/muleyuck/SnapLayer/issues).

[Back to SnapLayer](https://github.com/muleyuck/SnapLayer)
