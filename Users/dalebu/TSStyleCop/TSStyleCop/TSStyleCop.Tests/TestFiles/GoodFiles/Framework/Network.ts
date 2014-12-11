// ------------------------------------------------------------------------------
// <copyright file="Network.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Helper.ts" />
/// <reference path="GimmeExt.ts" />

/**
 * Network callback which gets called with the network response
 */
interface INetworkCallback {
    /**
     * Handles the network response
     * @param response - The response from the network call.  Could be a JSON object, string, or ArrayBuffer
     */
    (response: any): void;
}

/**
 * Internal request state
 */
interface IRequestState {
    /** The url being requested */
    url: string;

    /** The status of the request */
    status: NetworkStatus;

    /** The list of callbacks waiting for the network request */
    callbacks: INetworkCallback[];
}

/**
 * Status of the request
 */
enum NetworkStatus {
    /** The request has not been started */
    NotStarted,

    /** The request is executed, but has not been received */
    Pending,

    /** The request is complete */
    Complete,
}

/**
 * Static class of helpers which help simplify network downloads
 */
class Network {
    /** Request states keyed by url or JSONSO */
    private static Requests: { [key: string]: IRequestState; } = {};

    /**
     * Downloads the a binary response as an ArrayBuffer
     * @param url - The url to download
     * @param callback - The function to be called with the ArrayBuffer from the response
     */
    public static downloadBinary(url: string, callback: INetworkCallback): void {
        _downloadGeneric(url, callback, function beginBinaryDownload(request: IRequestState): void {
            _createXHR(url, request, "arraybuffer").send();
        });
    }

    /**
     * Downloads a json object from the server. Note that this call depends on 'XmlHttpRequest' and may be
     * subject to cross-domain origin policies.
     * @param url - The url to download
     * @param callback - The callback to be called with the JSON object as the 1st parameter
     */
    public static downloadJson(url: string, callback: INetworkCallback): void {
        _downloadGeneric(url, parseResponse, function beginJsonDownload(request: IRequestState): void {
            _createXHR(url, request).send();
        });

        /**
         * Parses the string response into a JSON object and calls the callback with the result
         * @param text - The test response from the server
         */
        function parseResponse(text: string): void {
            var response = Gimme.Internals.parseJSON(text);
            callback(response);
        }
    }

    /**
     * Downloads a json object from the server using JSONP
     * @param url - The url to download
     * @param callback - The callback to call with the JSON object when the request is complete
     * @param jsonso - The recommended jsonso value to uniquely identity the request in a cache friendly way
     */
    public static downloadJsonp(url: string, callback: INetworkCallback, jsonso?: string): void {
        jsonso = jsonso || _getJsonStateObject(url);
        url = url.replace("{jsonso}", jsonso);
        url = _addNetworkCallbackParameter(url);
        window.setTimeout(function downloadJsonpInternal(): void {
            _downloadGeneric(url, callback, function beginJsonpDownload(request: IRequestState): void {
                _downloadScript(url, request);
            }, jsonso);
        },
            0);
    }

    /**
     * Callback called when any request is completed.  Cleans up the request state and calls any awaiting callbacks
     * @param response - The response received
     * @param requestId - The url or jsonso for the request which finished
     */
    public static networkCallback(response: any, requestId: string): void {
        var request = _requests[requestId];
        request.status = NetworkStatus.Complete;
        var callbacks = request.callbacks;
        window.setTimeout(function networkCallbackExecute(): void {
            while (callbacks.length) {
                callbacks.pop()(response);
            }

            if (requestId !== request.url) {
                // This is the case for jsonp requests where the callback is called with a jsonso
                // as the 2nd parameter
                delete _requests[requestId];
            }

            delete _requests[request.url];
        },
            0);
    }

    /**
     * Generates a unique JSONSO string for the supplied URL which attempts to be a hash of the url
     * for cache friendliness
     * @returns A unique JSONSO string for the request
     */
    private static _getJsonStateObject(url: string): string {
        var hash = 0;
        var shift = 0;
        for (var i = 0; i < url.length; i++) {
            hash += (url.charCodeAt(i) << shift);
            shift++;
            if (shift > 6) {
                shift = 0;
            }
        }

        // If there's a conflict with the JSONSO being used by some other request try a new one
        var requestData = _requests[hash.toString(16)];
        while (requestData && requestData.url !== url) {
            hash++;
            requestData = _requests[hash.toString(16)];
        }

        return hash.toString(16);
    }

    /**
     * Basic download function which starts tracking the request
     * @param url - The url to load
     * @param callback - The function to call when the request completes
     * @param executor - The function which kicks off the request
     * @param jsonso - The jsonso object which will be used to identify the JSONP request
     */
    private static _downloadGeneric(url: string, callback: INetworkCallback, executor: (request: IRequestState) => void, jsonso?: string): void {
        var request = _requests[url];
        
        // Create a new request state object if there isn't one
        if (!request) {
            request = {
                url: url,
                status: NetworkStatus.NotStarted,
                callbacks: []
            };
            jsonso && (_requests[jsonso] = request);
            _requests[url] = request;
        }

        // Add the callback
        request.callbacks.push(callback);

        // Kick off the request if it hasn't been already
        if (request.status === NetworkStatus.NotStarted) {
            request.status = NetworkStatus.Pending;
            executor(request);
        }
    }

    /**
     * Creates an XMLHttpRequest
     * @param url - The url to send
     * @param request - The request state
     * @param responseType - The type of response to ask for from the XMLHttpRequest
     * @returns The created XMLHttpRequest
     */
    private static _createXHR(url: string, request: IRequestState, responseType?: string): XMLHttpRequest {
        var xhr: XMLHttpRequest = null;
        if (typeof XMLHttpRequest !== "undefined") {
            xhr = new XMLHttpRequest();
        } else if (typeof ActiveXObject !== "undefined") {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

        xhr.onreadystatechange = function onXHRReadyStateChange(): void {
            if (xhr.readyState === 4) {
                var response = xhr.response || xhr.responseText;
                if (response) {
                    networkCallback(response, url);
                } else {
                    throw "Empty response received downloading '" + url + "'. Please verify the request does not violate cross-domain origin policy.";
                }
            }
        };
        xhr.open("GET", url);
        responseType && (xhr.responseType = responseType);
        return xhr;
    }

    /**
     * Loads a script by adding a script tag to the document's head
     * @param url - The url to the script to load
     * @param request - The request state
     */
    private static _downloadScript(url: string, request: IRequestState): void {
        var script = <HTMLScriptElement>document.createElement("script");
        script.type = "text/javascript";
        script.language = "javascript";
        script.src = url;
        (<HTMLHeadElement>document.getElementsByTagName("head")[0]).appendChild(script);
    }

    /**
     * Takes a URL and adds a callback parameter pointing to the fully-qualified name of the networkCallback
     * function for use with JSONP
     * @param url - The original URL
     * @returns The URL with the callback parameter added
     */
    private static _addNetworkCallbackParameter(url: string): string {
        // For the default namespace of Microsoft.Maps, we don't need to add the callback parameter.
        var mapsNamespace = window["$MicrosoftMaps8"].toString();
        if (mapsNamespace !== "Microsoft.Maps") {
            var callbackValue = mapsNamespace + ".Internal._Network.networkCallback";
            
            // TODO: Consider writing a proper URL parsing class for manipulating URLs.
            if (url.indexOf("?") >= 0) {
                url += "&callback=" + encodeURIComponent(callbackValue);
            } else {
                url += "?callback=" + encodeURIComponent(callbackValue);
            }
        }

        return url;
    }
}