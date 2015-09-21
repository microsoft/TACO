Visit our [home page](http://taco.tools/) & [get started](http://taco.tools/docs/getting-started.html) in minutes!

# What is TACO?
The Tools for Apache Cordova – "TACO" for short – provide a set of command line utilities that make hybrid app development easier, friendlier, and faster. 

For developers new to Cordova, TACO makes it crazy-easy to setup your dev environment so you can begin coding immediately. The install-reqs utility downloads, installs and configures all the build tools you need for each mobile platform. Once you’ve started coding, TACO makes life a little sweeter by providing a gentle nudge toward the most likely “next steps” and best practices. If you’re looking for a safety blanket, TACO has one of those, too. “TACO Kits” provide a set of validated open source components (e.g. platforms, build tools and plugins) so you don’t have to wade through the morass of download stats, star ratings and open issues to know which components are both stable and compatible with your app. Since building for iOS platform requires a Mac, TACO also provides a utility to connect to a [remotebuild](http://taco.tools/docs/remote-build.html) server, so that you can build iOS projects from your Windows machine.  

Faster setup. Friendlier command line. Validated quality at run-time. TACO is your friend.


## Quick Start

Using TACO, start building awesome Apache Cordova apps really quickly by following these steps:

**1. Install the tools:**

Make sure you have [Node.js](https://nodejs.org/en/download/) installed. **Note:** Latest version of NodeJS has [issues with iOS build](https://github.com/Microsoft/cordova-docs/blob/master/known-issues/known-issues-ios.md#building-for-ios-hangs-when-nodejs-v40-is-installed)  

Run the following command to install the latest version of TACO:
<pre><code>
npm install -g taco-cli
</code></pre>

**Note:** On OSX and Linux, you may need to prefix this command with `sudo` 

**2. Create a new app:**
<pre><code>
taco create myAwesomeApp
</pre></code>
**3. Navigate to the directory of your new project:**
<pre><code>
cd myAwesomeApp
</pre></code>
**4. Add the Android platform:**
<pre><code>
taco platform add android
</pre></code>
**5. (Optional) Check for any missing Android dependencies:**
<pre><code>
taco install-reqs android
</pre></code>
**6. Build for Android:**
<pre><code>
taco build android
</pre></code>
**7. Run the app on the Android emulator:**
<pre><code>
taco emulate android
</pre></code>
After a few moments, your app will be running inside the Android emulator in all its awesomeness. The steps to build for Windows and iOS are very similar, but this should help you get started.

Remember, when in doubt, just type:
<pre><code>
taco help
</pre></code>


## Community

* Have a question that's not a feature request or bug report? [Discuss on Stack Overflow](https://stackoverflow.com/questions/tagged/taco)
* Read our [Blog](http://taco.tools/blog/index.html)
* Have a feature request or find a bug? [Submit an issue](https://github.com/microsoft/taco/issues)

## LICENSE

TACO is licensed under the MIT Open Source license.

