
# taco-remote

Build agent for the *remotebuild* server to build, run, and debug iOS apps created using Apache Cordova

*taco-remote* provides an HTTP API for submitting Apache Cordova build requests. When a request arrives, it asks *taco-remote-multiplexer* what package (build agent) should be used to actually build the submitted request, and then hands things off to that package.