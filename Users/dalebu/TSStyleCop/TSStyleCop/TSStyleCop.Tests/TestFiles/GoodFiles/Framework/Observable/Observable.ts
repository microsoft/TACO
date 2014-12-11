// ------------------------------------------------------------------------------
// <copyright file="Observable.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="../Debug.ts" />

/**
 * Collection of "static" functions useful for Observable objects
 */
class Observable {
    /**
     * Property prefix for adding animation storyboards to the objects being animated
     * @const
     */ 
    private static AnimationPrefix = "__animation_";

    /** Cache gimme object's constructor */
    private static GimmeConstructor = (<any>Gimme("")).constructor;

    /**
     * The named easing functions used in animations
     * @const
     */
    private static EasingFuncs = {
        linear: function (t: number): number { return t; },
        basic: function (t: number): number { return t; },
        exponentialOut: function (t: number): number { return Gimme.Effects.Easing.Exponential.ease_out(t, 4); },
        exponentialInOut: function (t: number): number { return Gimme.Effects.Easing.Exponential.ease_in_out(t, 16); }
    };

    /**
     * Gets a named property from a function by first trying for a getter function, then trying to get the raw property
     * @param object - The object to retrieve the value from
     * @param name - The name of the property to read
     * @returns The property's value
     */
    public static getValue(object: any, name: string): any {
        Debug.assertNotNull(object, "object");
        Debug.assertNotNullOrEmpty(name, "name");

        var getter = object["get" + capitalizeProp(name)];
        if (getter) {
            return getter.call(object);
        } else if (object.get) {
            return object.get(name);
        } else if (object.length === 1 && object.constructor === _gimmeConstructor) {
            // Used to read properties of gimme objects
            return getValue(object[0], name);
        } else {
            return object[name];
        }
    }

    /**
     * Sets the value of an object by first searching for a setter function then falling back to just setting a raw property
     * @param object - The object to set the value on
     * @param name - The name of the property to set
     * @param value - The value to assign to the specified property
     * @param animating - True if the call is happening due to an animation
     */
    public static setValue(object: any, name: string, value: any, animating?: boolean): void {
        Debug.assertNotNull(object, "object");
        Debug.assertNotNullOrEmpty(name, "name");

        if (!animating) {
            Observable.cancelAnimation(object, name);
        }

        var setter = object["set" + capitalizeProp(name)];
        if (setter) {
            setter.call(object, value);
        } else if (object.set) {
            object.set(name, value);
        } else if (object.set_attr) {
            object.set_attr(name, value);
        } else {
            object[name] = value;
        }
    }

    /**
     * Capitalizes a property name from camel case to pascal case by capitalizing the 1st character
     * @param propertyName - The name of the property to convert
     * @returns The PascalCased version of propertyName
     */
    public static capitalizeProp(propertyName: string): string {
        if (!(typeof propertyName === "string")) {
            return propertyName;
        }

        return propertyName.charAt(0).toUpperCase() + propertyName.substring(1);
    }

    /**
     * Checks if two values are equal
     * @param value1 - The first value to compare
     * @param value2 - The second value to compare
     * @returns true if both values are equivalent
     */
    public static areEqual(value1: any, value2: any): boolean {
        if (value1 === value2) {
            return true;
        } else if (typeof value1 !== typeof value2) {
            return false;
        } else if (typeof value1 === "object" && value1 && value2 && value1.constructor === Object && value2.constructor === Object) {
            var key: string;
            for (key in value1) {
                if (value1.hasOwnProperty(key)) {
                    if (!areEqual(value1[key], value2[key])) {
                        return false;
                    }
                }
            }

            for (key in value2) {
                if (value2.hasOwnProperty(key)) {
                    if (!areEqual(value1[key], value2[key])) {
                        return false;
                    }
                }
            }

            return true;
        } else {
            return value1 === value2;
        }
    }

    /**
     * Cancels any running animation for the property on the specified object
     * @param obj - The object to cancel the animation on
     * @param prop - The name of the property whose animation should be cancelled
     */
    public static cancelAnimation(obj: any, prop: string): void {
        var storyboard = obj[_animationPrefix + prop];
        if (storyboard) {
            storyboard.onStop && storyboard.onStop();
            storyboard.abort();
            obj[_animationPrefix + prop] = null;
        }
    }

    /**
     * Animates the property on the specified object with the specified options
     * options can contain:
     * -from: The starting value
     * -to: The ending value
     * -keyframes: An array of {time: milliseconds, value: value}
     * -duration: Duration of the animation in ms
     * -easing: Named easing function of custom easing function
     * @param obj - The object to be animated
     * @param prop - The name of the property to be animated
     * @param option - Animation options see function comment for details
     */
    public static animate(obj: any, prop: string, options: IAnimationOptions): void {
        Debug.assertNotNull(obj, "obj");
        Debug.assertNotNullOrEmpty(prop, "prop");
        Debug.assertNotNull(options, "options");
        Debug.assertNotNull(options.to === 0 || options.to || options.keyframes, "options.to or options.keyframes");

        var from = options.from || getValue(obj, prop);
        var to = options.to;
        var keyframes = options.keyframes;
        var duration = (options.duration >= 0) ? options.duration : ((keyframes && keyframes[keyframes.length - 1].time) || 300);
        cancelAnimation(obj, prop);
        if (duration === 0) {
            setValue(obj, prop, to);
            return;
        }

        var easing = (options.easing && _easingFuncs[options.easing]) || options.easing || _easingFuncs.basic;
        var storyboard = Gimme.Effects.Storyboard.create([obj], { value: 0 }, { value: 1 }, updateCallback, duration, null, onComplete, easing);
        obj[_animationPrefix + prop] = storyboard;
        storyboard.begin();
        var initialKeyFrame = { time: 0, value: from };
        var prevKeyframe = initialKeyFrame;
        var nextKeyframe = { time: duration, value: to };
        var segmentMinPercent = 0;
        var segmentMaxPercent = 1;
        if (keyframes) {
            updateSegment(0);
        }

        /**
         * Updates the prevKeyFrame, nextKeyFrame, segmentMinPercent and segmentMaxPercent
         * based on the current animation percent
         * @param percent - The percent completion from 0-1
         */
        function updateSegment(percent: number): void {
            for (var i = 0; i < keyframes.length; i++) {
                var frame = keyframes[i];
                if (frame.time >= duration * percent) {
                    prevKeyframe = (i === 0) ? initialKeyFrame : keyframes[i - 1];
                    nextKeyframe = frame;
                    segmentMinPercent = prevKeyframe.time / duration;
                    segmentMaxPercent = nextKeyframe.time / duration;
                    break;
                }
            }
        }

        /**
         * Per-frame callback for the animation.  Sets the values on the destination object
         * @param items - Ignored since we use obj from the closure scope
         * @param percent - The percent completion of the animation from 0-1
         */
        function updateCallback(items: any, percent: any): void {
            percent = percent.value;
            if (keyframes && (percent < segmentMinPercent || percent > segmentMaxPercent)) {
                updateSegment(percent);
            }

            var segmentPercent = (percent - segmentMinPercent) / (segmentMaxPercent - segmentMinPercent);
            var current: any;
            if (typeof nextKeyframe.value === "function") {
                current = nextKeyframe.value(segmentPercent);
            } else {
                current = _lerp(prevKeyframe.value, nextKeyframe.value, segmentPercent);
            }

            setValue(obj, prop, current, true);
            options.frameCallback && options.frameCallback(<number>percent);
        }

        /**
         * Handles animation complettion
         */
        function onComplete(): void {
            obj[_animationPrefix + prop] = null;
            if (options.repeat) {
                storyboard.begin();
            } else if (options.autoReverse) {
                storyboard.reverse();
            } else {
                options.onStop && options.onStop();
                options.onComplete && options.onComplete();
            }
        }
    }

    /**
     * Linearly interpolates between obj1 and obj2 at the specified percent where 0 is obj1, and 1 is obj2,
     * If obj1 and obj2 are JSON objects then the properties are recursively interpolated
     * @param obj1 - The value to return if percent==0
     * @param obj2 - The value to return if percent==1
     * @param percent - The desired percent between the two objects
     * @returns The interpolated value
     */
    private static _lerp(obj1: any, obj2: any, percent: number): any {
        if (typeof obj1 === typeof obj2) {
            switch (typeof obj1)
            {
                case "object":
                    var current: any = {};
                    var key: string;
                    for (key in obj1) {
                        if (obj1.hasOwnProperty(key)) {
                            current[key] = _lerp(obj1[key], obj2[key], percent);
                        }
                    }

                    return current;
                case "number":
                    return obj1 + (obj2 - obj1) * percent;
                case "boolean":
                    return percent < 0.5 ? obj1 : obj2;
            }
        }
    }
}

/**
 * Interface for JSON options which can be used in Observable.animate
 */
interface IAnimationOptions {
    /** True if the animation should auto-reverse when completed.  Default is false */
    autoReverse?: boolean;

    /** True if the animation should repeat once completed.  Default is false */
    repeat?: boolean;

    /** The starting value for the property animation.  If unspecified, the current value is used as the start */
    from?: any;

    /** The ending value for the property animation.  Either to or keyframes must be specified */
    to?: any;

    /** The animation duration in milliseconds.  Default is 300 */
    duration?: number;

    /** The list of keyframes in the animation.  Either to or keyframes must be specified */
    keyframes?: IKeyFrame[];

    /** The easing function to use during the animation */
    easing?: any;

    /**
     * Optional function to be called with each animation frame
     * @param percent - The percent completion of the animation from 0-1
     */
    frameCallback?: (percent: number) => void;

    /**
     * Optional function to be called when the animation is stopped (cancelled or complete)
     */
    onStop?: () => void;

    /**
     * Optional function to be called when the animation is complete
     */
    onComplete?: () => void;
}

/**
 * Interface for a key frame during an animation
 */
interface IKeyFrame {
    /** The time in milliseconds where the keyframe should be */
    time: number;

    /** The value that should be assigned to the property at that point in the animation */
    value: any;
}
