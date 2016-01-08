
# taco-livereload
taco-livereload is a package intended to introduce the livereload functionality to TACO.
it enables developers to have a short feedback loop when editing HTML/CSS/Javascript in a Cordova-based app.

## Known Issues

- 'CTRL + C' does NOT work with cordova-ios (when deploying to a device)
When dealing with cordova-ios(on MAC OSX), it is impossible to use 'CTRL + C' to exit livereload mode, 
due to an issue with the [npm package 'ios-sim'](https://www.npmjs.com/package/ios-deploy) which cordova-ios uses to deploy to iOS-based devices.

- LiveReload doesnt work with Ionic Base Template
Livereload doesn't work with projects created with an Ionic Base Template (via `taco create foo --template https://github.com/driftyco/ionic-app-base`).
This is due to the fact that the `cordova-plugin-whitelist` plugin isn't part of the template's config.xml.
To resolve it, do the following:
    - `taco platform add cordova-plugin-whitelist --save`
    - `taco run <platform> --livereload`


