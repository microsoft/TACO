# cordova-plugin-livereload
This plugin's goal is to integrate livereload and gestures synchronization across devices into the Cordova development workflow. It is based on BrowserSync.

What it does :

* Watch files in your www folder and automatically reload HTML and CSS in all connected devices

* Synchronize scrolls, clicks and form inputs on multiple devices.

## Supported platforms
* Android
* iOS

## How to use it

It can be used in 2 ways:

* As a cordova plugin
* As an NPM package (you can include it in your custom workflows)

## Using it as a plugin

* Make sure your device/emulator and your computer are connected to the same wifi network


* Install the plugin on your machine : 

    ```cordova plugin add cordova-plugin-livereload```

* Create your cordova project :

    ``` cordova create myProject ```

* Navigate to your newly created project :

    ``` cd myProject ```

* Run your app with the ```--livereload flag```, Note the extra ```--```. This step launches the app on your device/emulator :

    ```cordova run android -- --livereload```

* Make changes to your HTML, CSS or Javascript and watch those changes instantaneously be reflected on your device/emulator

## Options

* Ignoring files

You can specify files to ignore with the --ignore=path option:
 This option accepts any [anymatch-compatible definition](https://www.npmjs.com/package/anymatch). It defines files/paths to be ignored :

```cordova run android -- --livereload --ignore=build/**/*.*```

* Local tunnel

In case you're facing connection issues due to proxy/firewall, you can use the --tunnel option:

```cordova run android -- --livereload --tunnel```

 This option allows you to easily access the livereload server on your local development machine without messing with DNS and firewall settings.
 It relies on [Localtunnel](http://localtunnel.me/), which will assign you a unique publicly accessible url that will proxy all requests to your locally running development server.

* ghostMode (Syncing across devices)

By default, gestures(clicks, scrolls & form inputs) on any device will be mirrored to all others.
This option allows you to disable it if you want:

```cordova run android ios -- --livereload --ghostMode=false```

## Using it as an NPM package

This codebase can also be used as an NPM package, making it easier to integrate in your custom workflows.
Here's an example of how to use it:



       var lr = require('cordova-plugin-livereload');
       var cordova = require('cordova-lib');

       //  Start LiveReload server
       var projectRoot = '/home/omefire/Projects/mileage-tracker';
       var platforms = ['android', 'ios'];

       return lr.start(projectRoot, platforms, {
           ghostMode: true,
           ignore: 'build/**/*.*',
           cb: function (event, file, lrHandle) {
           
               // After a file changes, first run `cordova prepare`, then reload.
               cordova.raw.prepare().then(function () {
                   var patcher = new lr.Patcher(projectRoot, platforms);
                   return patcher.removeCSP();
               }).then(function () {
                   if (event === 'change') {
                       return lrHandle.reloadFile(file);
                   }

                   // If new files got added or deleted, reload the whole app instead of specific files only
                   // e.g: index.html references a logo file 'img/logo.png'
                   // deleting the 'img/logo.png' file will trigger a reload that will remove it from the rendered app
                   // likewise, adding the 'img/logo.png' file will trigger it to be shown on the app
                   return lrHandle.reloadBrowsers();
               }).fail(function (err) {
                   var msg = ' - An error occurred: ' + err;
                   logger.show(msg);
                   lrHandle.stop();
               });
           }
        });
```




## LICENSE

cordova-plugin-livereload is licensed under the MIT Open Source license.