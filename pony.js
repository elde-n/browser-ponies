/*
 * Copyright (c) 2011-2013 Mathias Panzenböck
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

"use strict";

var tinydebugBrowserPonies = false;
if (typeof(BrowserPonies) !== "object") {
    // Shims:
    (function() {
        var shim = function(obj, shims) {
            for (var name in shims) {
                if (!(name in obj)) {
                    obj[name] = shims[name];
                }
            }
        };

        shim(String.prototype, {
            trim: function() {
                return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            },
            trimLeft: function() {
                return this.replace(/^\s\s*/, '');
            },
            trimRight: function() {
                return this.replace(/\s\s*$/, '');
            }
        });

        shim(Array, {
            isArray: function(object) {
                return Object.prototype.toString.call(object) === '[object Array]';
            }
        });

        shim(Array.prototype, {
            indexOf: function(searchElement, fromIndex) {
                if (!fromIndex || fromIndex < 0) fromIndex = 0;
                for (; fromIndex < this.length; ++fromIndex) {
                    if (this[fromIndex] === searchElement) {
                        return fromIndex;
                    }
                }
                return -1;
            }
        });

        shim(Function.prototype, {
            bind: function(self) {
                var funct = this;
                var partial = Array.prototype.slice.call(arguments, 1);
                return function() {
                    return funct.apply(self, partial.concat(Array.prototype.slice.call(arguments)));
                };
            }
        });

        shim(Date, {
            now: function() {
                return new Date().getTime();
            }
        });

        // dummy console object to prevent crashes on forgotten debug messages:
        if (typeof(console) === "undefined")
            shim(window, { console: {} });
        shim(window.console, { log: function() {} });
        shim(window.console, {
            info: window.console.log,
            warn: window.console.log,
            error: window.console.log,
            trace: window.console.log,
            dir: window.console.log
        });
    })();

    var BrowserPonies = (function() {
        var BaseZIndex = 9000000;
        var observe = document.addEventListener ?
            function(element, event, handler) {
                element.addEventListener(event, handler, false);
            } :
            function(element, event, handler) {
                var wrapper = '_eventHandlingWrapper' in handler ?
                    handler._eventHandlingWrapper :
                    (handler._eventHandlingWrapper = function() {
                        var event = window.event;
                        if (!('stopPropagation' in event)) {
                            event.stopPropagation = function() {
                                this.cancelBubble = true;
                            };
                        }
                        if (!('preventDefault' in event)) {
                            event.preventDefault = function() {
                                this.returnValue = false;
                            };
                        }
                        if (!('target' in event)) {
                            event.target = event.srcElement;
                        }
                        return handler.call(this, event);
                    });
                element.attachEvent('on' + event, wrapper);
            };

        var stopObserving = document.removeEventListener ?
            function(element, event, handler) {
                element.removeEventListener(event, handler, false);
            } :
            function(element, event, handler) {
                if ('_eventHandlingWrapper' in handler) {
                    element.detachEvent('on' + event, handler._eventHandlingWrapper);
                }
            };

        var documentHidden = function() {
            var names = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden'];
            for (var i = 0; i < names.length; ++i) {
                var name = names[i];
                if (name in document) {
                    return document[name];
                }
            }
            return false;
        };

        var visibilitychange = function(event) {
            if (timer !== null) {
                if (documentHidden()) {
                    clearTimeout(timer);
                } else {
                    lastTime = Date.now();
                    tick();
                }
            }
        };

        if (typeof(document.hidden) !== 'undefined') {
            observe(document, 'visibilitychange', visibilitychange);
        } else if (typeof(document.webkitHidden) !== 'undefined') {
            observe(document, 'webkitvisibilitychange', visibilitychange);
        } else if (typeof(document.mozHidden) !== 'undefined') {
            observe(document, 'mozvisibilitychange', visibilitychange);
        } else if (typeof(document.msHidden) !== 'undefined') {
            observe(document, 'msvisibilitychange', visibilitychange);
        }

        var windowSize = 'innerWidth' in window ?
            function() {
                return {
                    width: window.innerWidth,
                    height: window.innerHeight
                };
            } :
            function() {
                return {
                    width: document.documentElement.clientWidth,
                    height: document.documentElement.clientHeight
                };
            };

        var padd = function(s, fill, padding, right) {
            if (s.length >= fill) {
                return s;
            }
            padding = new Array(fill - s.length + 1).join(padding);
            return right ? (padding + s) : (s + padding);
        };

        var format = function(fmt) {
            var s = '';
            var argind = 1;
            while (fmt) {
                var m = /^([^%]*)%(-)?(0)?(\d+)?(?:\.(\d+)?)?([dfesj%])(.*)$/.exec(fmt);
                if (!m) {
                    s += fmt;
                    break;
                }
                s += m[1];
                fmt = m[7];

                var right = m[2] !== '-';
                var fill = m[4] ? parseInt(m[4]) : 0;
                var decimal = m[5] ? parseInt(m[5]) : 6;
                var padding = right ? (m[3] || ' ') : ' ';

                switch (m[6]) {
                    case 'd':
                        s += padd(parseInt(arguments[argind++]).toFixed(0), fill, padding, right);
                        break;
                    case 'f':
                        s += padd(Number(arguments[argind++]).toFixed(decimal), fill, padding, right);
                        break;
                    case 'e':
                        s += padd(Number(arguments[argind++]).toExponential(decimal), fill, padding, right);
                        break;
                    case 's':
                        s += padd(String(arguments[argind++]), fill, ' ', right);
                        break;
                    case 'j':
                        s += padd(JSON.stringify(arguments[argind++]), fill, ' ', right);
                        break;
                    case '%':
                        s += padd('%', fill, ' ', right);
                }
            }
            return s;
        };

        var extend = function(dest, src) {
            for (var name in src) {
                dest[name] = src[name];
            }
            return dest;
        };

        var partial = function(fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            return function() {
                return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
            };
        };


        var Opera = Object.prototype.toString.call(window.opera) === '[object Opera]';
        var IE, IEVersion;
        (function() {
            var m = (/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(navigator.userAgent);
            IE = !!m;
            if (IE) {
                IEVersion = m[1].split(".");
                for (var i = 0; i < IEVersion.length; ++i) {
                    IEVersion[i] = parseInt(IEVersion[i], 10);
                }
            }
        })();
        var Gecko = navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1;
        var HasAudio = typeof(Audio) !== "undefined";
        var add = function(element, arg) {
            if (!arg) return;
            if (typeof(arg) === "string") {
                element.appendChild(document.createTextNode(arg));
            } else if (Array.isArray(arg)) {
                for (var i = 0, n = arg.length; i < n; ++i) {
                    add(element, arg[i]);
                }
            } else if (arg.nodeType === 1 || arg.nodeType === 3) {
                element.appendChild(arg);
            } else {
                for (var attr in arg) {
                    var value = arg[attr];
                    if (attr === "class" || attr === "className") {
                        element.className = String(value);
                    } else if (attr === "for" || attr === "htmlFor") {
                        element.htmlFor = String(value);
                    } else if (/^on/.test(attr)) {
                        if (typeof(value) !== "function") {
                            throw new Error("Event listeners must be a function.");
                        }
                        observe(element, attr.replace(/^on/, ""), value);
                    } else if (attr === 'style') {
                        if (typeof(value) === "object") {
                            for (var name in value) {
                                var cssValue = value[name];
                                if (name === 'float') {
                                    element.style.cssFloat = cssValue;
                                    element.style.styleFloat = cssValue;
                                } else if (name === 'opacity') {
                                    setOpacity(element, Number(cssValue));
                                } else {
                                    try {
                                        element.style[name] = cssValue;
                                    } catch (e) {
                                        if (tinydebugBrowserPonies == true) {
                                            console.error(name + '=' + cssValue + ' ' + e.toString());
                                        }
                                    }
                                }
                            }
                        } else {
                            element.style.cssText += ";" + value;
                        }
                    } else if (attr === 'value' && element.nodeName === 'TEXTAREA') {
                        element.value = value;
                    } else if (value === true) {
                        element.setAttribute(attr, attr);
                    } else if (value === false) {
                        element.removeAttribute(attr);
                    } else {
                        element.setAttribute(attr, String(value));
                    }
                }
            }
        };

        var setOpacity = IE && IEVersion[0] < 10 ?
            function(element, opacity) {
                try {
                    element.style.filter = element.style.filter.replace(/\balpha\([^\)]*\)/gi, '') +
                        'alpha(opacity=' + (Number(opacity) * 100) + ')';
                } catch (e) {}
                element.style.opacity = opacity;
            } :
            function(element, opacity) {
                element.style.opacity = opacity;
            };

        var tag = function(name) {
            var element = document.createElement(name);
            for (var i = 1, n = arguments.length; i < n; ++i) {
                add(element, arguments[i]);
            }
            return element;
        };

        var has = function(obj, name) {
            return Object.prototype.hasOwnProperty.call(obj, name);
        };

        var removeAll = function(array, item) {
            for (var i = 0; i < array.length;) {
                if (array[i] === item) {
                    array.splice(i, 1);
                } else {
                    ++i;
                }
            }
        };

        var dataUrl = function(mimeType, data) {
            return 'data:' + mimeType + ';base64,' + Base64.encode(data);
        };

        var escapeXml = function(s) {
            return s.replace(/&/g, '&amp;').replace(
                /</g, '&lt;').replace(/>/g, '&gt;').replace(
                /"/g, '&quot;').replace(/'/g, '&apos;');
        };

        // inspired by:
        // http://farhadi.ir/posts/utf8-in-javascript-with-a-new-trick
        var Base64 = {
            encode: function(input) {
                return btoa(unescape(encodeURIComponent(input)));
            },
            decode: function(input) {
                return decodeURIComponent(escape(atob(input)));
            }
        };

        var PonyINI = {
            parse: function(text) {
                var lines = text.split(/\r?\n/);
                var rows = [];
                for (var i = 0, n = lines.length; i < n; ++i) {
                    var line = lines[i].trim();
                    if (line.length === 0 || line.charAt(0) === "'")
                        continue;
                    var row = [];
                    line = this.parseLine(line, row);
                    if (line.length !== 0) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("trailing text:", line);
                        }
                    }
                    rows.push(row);
                }
                return rows;
            },
            parseLine: function(line, row) {
                var pos;
                while ((line = line.trimLeft()).length > 0) {
                    var ch = line.charAt(0);
                    switch (ch) {
                        case '"':
                            line = line.slice(1);
                            pos = line.search('"');
                            if (pos < 0) pos = line.length;
                            row.push(line.slice(0, pos));
                            line = line.slice(pos);
                            if (line.length > 0) {
                                ch = line.charAt(0);
                                if (ch === '"') {
                                    line = line.slice(1).trimLeft();
                                    ch = line.charAt(0);
                                }
                                if (line.length > 0) {
                                    if (ch === ',') {
                                        line = line.slice(1);
                                    } else if (ch !== '}') {
                                        if (tinydebugBrowserPonies == true) {
                                            console.error("data after quoted string:", line);
                                        }
                                    }
                                }
                            } else {
                                if (tinydebugBrowserPonies == true) {
                                    console.error("unterminated quoted string");
                                }
                            }
                            break;

                        case ',':
                            line = line.slice(1);
                            row.push("");
                            break;

                        case '{':
                            var nested = [];
                            row.push(nested);
                            line = this.parseLine(line.slice(1), nested).trimLeft();
                            if (line.length > 0) {
                                ch = line.charAt(0);
                                if (ch !== '}') {
                                    if (tinydebugBrowserPonies == true) {
                                        console.error("data after list:", line);
                                    }
                                } else {
                                    line = line.slice(1).trimLeft();
                                    ch = line.charAt(0);
                                }

                                if (ch === ',') {
                                    line = line.slice(1);
                                }
                            } else {
                                if (tinydebugBrowserPonies == true) {
                                    console.error("unterminated list");
                                }
                            }
                            break;

                        case '}':
                        case '\n':
                            return line;

                        default:
                            pos = line.search(/[,}]/);
                            if (pos < 0) pos = line.length;
                            row.push(line.slice(0, pos).trim());
                            line = line.slice(pos);
                            if (line.length > 0) {
                                ch = line.charAt(0);
                                if (ch === ',') {
                                    line = line.slice(1);
                                } else if (ch !== '}') {
                                    if (tinydebugBrowserPonies == true) {
                                        console.error("syntax error:", line);
                                    }
                                }
                            }
                    }
                }
                return line;
            }
        };

        var parseBoolean = function(value) {
            var s = value.trim().toLowerCase();
            if (s === "true") return true;
            else if (s === "false") return false;
            else throw new Error("illegal boolean value: " + value);
        };

        var parsePoint = function(value) {
            if (typeof(value) === "string")
                value = value.split(",");
            if (value.length !== 2 || !/^\s*-?\d+\s*$/.test(value[0]) || !/^\s*-?\d+\s*$/.test(value[1])) {
                throw new Error("illegal point value: " + value.join(","));
            }
            return { x: parseInt(value[0], 10), y: parseInt(value[1], 10) };
        };

        var $ = function(element_or_id) {
            if (typeof(element_or_id) === "string") {
                return document.getElementById(element_or_id);
            } else if (element_or_id && element_or_id.nodeType === 1) {
                return element_or_id;
            } else {
                return null;
            }
        };

        var distance = function(p1, p2) {
            var dx = p2.x - p1.x;
            var dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
        };

        var randomSelect = function(list) {
            return list[Math.floor(list.length * Math.random())];
        };

        var Movements = {
            Left: 0,
            Right: 1,
            Up: 2,
            Down: 3,
            UpLeft: 4,
            UpRight: 5,
            DownLeft: 6,
            DownRight: 7
        };

        var movementName = function(mov) {
            for (var name in Movements) {
                if (Movements[name] === mov) {
                    return name;
                }
            }
            return "Not a Movement";
        };

        var AllowedMoves = {
            None: 0,
            HorizontalOnly: 1,
            VerticalOnly: 2,
            HorizontalVertical: 3,
            DiagonalOnly: 4,
            DiagonalHorizontal: 5,
            DiagonalVertical: 6,
            All: 7,
            MouseOver: 8,
            Sleep: 9,
            Dragged: 10
        };

        var Locations = {
            Top: 0,
            Bottom: 1,
            Left: 2,
            Right: 3,
            BottomRight: 4,
            BottomLeft: 5,
            TopRight: 6,
            TopLeft: 7,
            Center: 8,
            Any: 9,
            AnyNotCenter: 10
        };

        var AudioMimeTypes = {
            wav: 'audio/wav',
            webm: 'audio/webm',
            mpeg: 'audio/mpeg',
            mpga: 'audio/mpeg',
            mpg: 'audio/mpeg',
            mp1: 'audio/mpeg;codecs="mp1"',
            mp2: 'audio/mpeg;codecs="mp2"',
            mp3: 'audio/mpeg;codecs="mp3"',
            mp4: 'audio/mp4',
            mp4a: 'audio/mp4',
            ogg: 'audio/ogg',
            oga: 'audio/ogg',
            flac: 'audio/ogg;codecs="flac"',
            spx: 'audio/ogg;codecs="speex"'
        };

        var locationName = function(loc) {
            for (var name in Locations) {
                if (Locations[name] === loc) {
                    return name;
                }
            }
            return "Not a Location";
        };

        var Interaction = function Interaction(interaction) {
            this.name = interaction.name;
            this.probability = interaction.probability;
            this.proximity = interaction.proximity === "default" ? 640 : interaction.proximity;
            this.activate = interaction.activate;
            this.delay = interaction.delay;
            this.targets = [];
            this.behaviors = [];

            for (var i = 0, n = interaction.behaviors.length; i < n; ++i) {
                this.behaviors.push(interaction.behaviors[i].toLowerCase());
            }

            for (var i = 0, n = interaction.targets.length; i < n; ++i) {
                var name = interaction.targets[i].toLowerCase();
                if (!has(ponies, name)) {
                    if (tinydebugBrowserPonies == true) {
                        console.warn("Interaction " + this.name + " of pony " + interaction.pony +
                            " references non-existing pony " + name);
                    }
                } else {
                    var pony = ponies[name];
                    for (var j = 0; j < this.behaviors.length;) {
                        var behavior = this.behaviors[j];
                        if (has(pony.behaviors_by_name, behavior)) {
                            ++j;
                        } else {
                            this.behaviors.splice(j, 1);
                        }
                    }
                    this.targets.push(pony);
                }
            }
        };

        Interaction.prototype = {
            reachableTargets: function(pos) {
                var targets = [];
                var n = this.targets.length;
                if (n === 0)
                    return targets;
                for (var i = 0; i < n; ++i) {
                    var pony = this.targets[i];
                    var instance = null;
                    var instance_dist = Infinity;
                    for (var j = 0, m = pony.instances.length; j < m; ++j) {
                        var inst = pony.instances[j];
                        var dist = distance(pos, inst.position());
                        if (dist <= this.proximity && dist < instance_dist) {
                            instance = inst;
                            instance_dist = dist;
                        }
                    }
                    if (instance) {
                        targets.push([instance_dist, instance]);
                    } else if (this.activate === "all") {
                        return null;
                    }
                }
                if (targets.length === 0) {
                    return null;
                }
                if (this.activate === "one") {
                    targets.sort(function(lhs, rhs) {
                        return lhs[0] - rhs[0];
                    });
                    return [targets[0][1]];
                } else {
                    for (var i = 0; i < targets.length; ++i) {
                        targets[i] = targets[i][1];
                    }
                }
                return targets;
            }
        };

        var Behavior = function Behavior(baseurl, behavior) {
            extend(this, behavior);

            if (!this.name || this.name.toLowerCase() === 'none') {
                throw new Error(baseurl + ': illegal behavior name ' + this.name);
            }

            if (this.follow) this.follow = this.follow.toLowerCase();
            this.movement = null;
            var movement = behavior.movement.replace(/[-_\s]/g, '').toLowerCase();

            for (var name in AllowedMoves) {
                if (name.toLowerCase() === movement) {
                    this.movement = AllowedMoves[name];
                    break;
                }
            }

            if (this.movement === null) {
                throw new Error(baseurl + ": illegal movement " + behavior.movement + " for behavior " + behavior.name);
            }

            this.rightsize = { width: 0, height: 0 };
            if (behavior.rightimage) {
                this.rightimage = baseurl + behavior.rightimage;
            }

            this.leftsize = { width: 0, height: 0 };
            if (behavior.leftimage) {
                this.leftimage = baseurl + behavior.leftimage;
            }

            // XXX: bugfix for ini files: interprete (0, 0) as missing
            if (!this.rightcenter || (this.rightcenter.x === 0 && this.rightcenter.y === 0)) {
                this.rightcenter = { x: 0, y: 0, missing: true };
            }

            if (!this.leftcenter || (this.leftcenter.x === 0 && this.leftcenter.y === 0)) {
                this.leftcenter = { x: 0, y: 0, missing: true };
            }

            this.effects = [];
            this.effects_by_name = {};
            if ('effects' in behavior) {
                for (var i = 0, n = behavior.effects.length; i < n; ++i) {
                    var effect = new Effect(baseurl, behavior.effects[i]);
                    this.effects_by_name[effect.name.toLowerCase()] = effect;
                    this.effects.push(effect);
                }
            }
        };

        Behavior.prototype = {
            deref: function(property, pony) {
                var name = this[property];
                var lower_name = (name || '').toLowerCase();
                if (name && lower_name !== 'none') {
                    if (has(pony.behaviors_by_name, lower_name)) {
                        this[property] = pony.behaviors_by_name[lower_name];
                    } else {
                        if (tinydebugBrowserPonies == true) {
                            console.warn(format("%s: Behavior %s of pony %s references non-existing behavior %s.",
                                pony.baseurl, this.name, pony.name, name));
                        }
                        delete this[property];
                    }
                } else {
                    delete this[property];
                }
            },
            preload: function() {
                for (var i = 0, n = this.effects.length; i < n; ++i) {
                    this.effects[i].preload();
                }

                if (this.rightimage) {
                    preloadImage(this.rightimage, function(image) {
                        this.rightsize.width = image.width;
                        this.rightsize.height = image.height;
                        if (this.rightcenter.missing) {
                            this.rightcenter = {
                                x: Math.round(image.width * 0.5),
                                y: Math.round(image.height * 0.5)
                            };
                        }
                    }.bind(this));
                }

                if (this.leftimage) {
                    preloadImage(this.leftimage, function(image) {
                        this.leftsize.width = image.width;
                        this.leftsize.height = image.height;
                        if (this.leftcenter.missing) {
                            this.leftcenter = {
                                x: Math.round(image.width * 0.5),
                                y: Math.round(image.height * 0.5)
                            };
                        }
                    }.bind(this));
                }
            },
            isMoving: function() {
                if (this.follow || this.x || this.x) return true;
                switch (this.movement) {
                    case AllowedMoves.None:
                    case AllowedMoves.MouseOver:
                    case AllowedMoves.Sleep:
                        return false;
                    default:
                        return true;
                }
            }
        };

        var parseLocation = function(value) {
            var loc = value.replace(/[-_\s]/g, '').toLowerCase();
            for (var name in Locations) {
                if (name.toLowerCase() === loc) {
                    return Locations[name];
                }
            }
            throw new Error('illegal location: ' + value);
        };

        var Effect = function Effect(baseurl, effect) {
            extend(this, effect);
            this.name = effect.name.toLowerCase();

            var locs = ['rightloc', 'leftloc', 'rightcenter', 'leftcenter'];
            for (var i = 0; i < locs.length; ++i) {
                var name = locs[i];
                if (name in effect) {
                    this[name] = parseLocation(effect[name]);
                }
            }

            this.rightsize = { width: 0, height: 0 };
            if (effect.rightimage) {
                this.rightimage = baseurl + effect.rightimage;
            }
            this.rightcenter_point = { x: 0, y: 0 };

            this.leftsize = { width: 0, height: 0 };
            if (effect.leftimage) {
                this.leftimage = baseurl + effect.leftimage;
            }
            this.leftcenter_point = { x: 0, y: 0 };
        };

        Effect.prototype = {
            preload: function() {
                if (this.rightimage) {
                    preloadImage(this.rightimage, function(image) {
                        this.rightsize.width = image.width;
                        this.rightsize.height = image.height;
                        this.rightcenter_point = {
                            x: Math.round(image.width * 0.5),
                            y: Math.round(image.height * 0.5)
                        };
                    }.bind(this));
                }

                if (this.leftimage) {
                    preloadImage(this.leftimage, function(image) {
                        this.leftsize.width = image.width;
                        this.leftsize.height = image.height;
                        this.leftcenter_point = {
                            x: Math.round(image.width * 0.5),
                            y: Math.round(image.height * 0.5)
                        };
                    }.bind(this));
                }
            }
        };

        var equalLength = function(s1, s2) {
            var n = Math.min(s1.length, s2.length);
            for (var i = 0; i < n; ++i) {
                if (s1.charAt(i) !== s2.charAt(i)) {
                    return i;
                }
            }
            return n;
        };

        var resources = {};
        var resource_count = 0;
        var resource_loaded_count = 0;
        var onload_callbacks = [];
        var onprogress_callbacks = [];

        var loadImage = function(loader, url, observer) {
            var image = loader.object = new Image();
            observe(image, 'load', partial(observer, true));
            observe(image, 'error', partial(observer, false));
            observe(image, 'abort', partial(observer, false));
            image.src = browser.runtime.getURL(url);
        };

        var createAudio = function(urls) {
            var audio = new Audio();

            if (typeof(urls) === "string") {
                audio.src = browser.runtime.getURL(urls);
            } else {
                for (var type in urls) {
                    var source = tag('source', { src: urls[type] });

                    if (type !== "audio/x-unknown") source.type = type;

                    audio.appendChild(source);
                }
            }

            return audio;
        };

        var loadAudio = function(urls) {
            return function(loader, id, observer) {
                var audio = loader.object = createAudio(urls);
                observe(audio, 'loadeddata', partial(observer, true));
                observe(audio, 'error', partial(observer, false));
                observe(audio, 'abort', partial(observer, false));
                audio.preload = 'auto';
            };
        };

        var preloadImage = function(url, callback) {
            preload(loadImage, url, callback);
        };

        var preloadAudio = function(urls, callback) {
            var fakeurl;
            if (typeof(urls) === "string") {
                fakeurl = urls;
            } else {
                var list = [];
                for (var type in urls) {
                    list.push(urls[type]);
                }
                if (list.length === 0) {
                    throw new Error("no audio url to preload");
                } else if (list.length === 1) {
                    fakeurl = list[0];
                } else {
                    var common = list[0];
                    for (var i = 1; i < list.length; ++i) {
                        var n = equalLength(common, list[i]);
                        if (n !== common.length) {
                            common = common.slice(0, n);
                        }
                    }
                    for (var i = 0; i < list.length; ++i) {
                        list[i] = list[i].slice(common.length);
                    }

                    list.sort();
                    fakeurl = common + '{' + list.join('|') + '}';
                }
            }

            preload(loadAudio(urls), fakeurl, callback);
        };

        var preload = function(load, url, callback) {
            if (has(resources, url)) {
                if (callback) {
                    var loader = resources[url];
                    if (loader.loaded) {
                        callback(loader.object);
                    } else {
                        loader.callbacks.push(callback);
                    }
                }
            } else {
                ++resource_count;
                var loader = resources[url] = {
                    loaded: false,
                    callbacks: callback ? [callback] : []
                };

                load(loader, url, function(success) {
                    if (loader.loaded) {
                        if (tinydebugBrowserPonies == true) {
                            console.error('resource loaded twice: ' + url);
                        }
                        return;
                    }
                    loader.loaded = true;
                    ++resource_loaded_count;
                    if (success) {
                        if (tinydebugBrowserPonies == true) {
                            console.log(format('%3.0f%% %d of %d loaded: %s',
                                resource_loaded_count * 100 / resource_count,
                                resource_loaded_count, resource_count,
                                url));
                        }
                    } else {
                        if (tinydebugBrowserPonies == true) {
                            console.error(format('%3.0f%% %d of %d load error: %s',
                                resource_loaded_count * 100 / resource_count,
                                resource_loaded_count, resource_count,
                                url));
                        }
                    }
                    for (var i = 0, n = onprogress_callbacks.length; i < n; ++i) {
                        onprogress_callbacks[i](resource_loaded_count, resource_count, url, success);
                    }
                    for (var i = 0, n = loader.callbacks.length; i < n; ++i) {
                        loader.callbacks[i](loader.object, success);
                    }
                    delete loader.callbacks;

                    if (resource_loaded_count === resource_count) {
                        for (var i = 0, n = onload_callbacks.length; i < n; ++i) {
                            onload_callbacks[i]();
                        }
                        onload_callbacks = [];
                    }
                });
            }
        };

        preload(function(loader, url, observer) {
            if (document.body) {
                observer(true);
            } else {
                var loaded = false;
                var fireLoad = function() {
                    if (!loaded) {
                        loaded = true;
                        observer(true);
                    }
                };

                if (document.addEventListener) {
                    // all browsers but IE implement HTML5 DOMContentLoaded
                    observe(document, 'DOMContentLoaded', fireLoad);
                } else {
                    var checkReadyState = function() {
                        if (document.readyState === 'complete') {
                            stopObserving(document, 'readystatechange', checkReadyState);
                            fireLoad();
                        }
                    };

                    observe(document, 'readystatechange', checkReadyState);
                }

                // fallback
                observe(window, 'load', fireLoad);
            }
        }, '');

        var onload = function(callback) {
            if (resource_loaded_count === resource_count) {
                callback();
            } else {
                onload_callbacks.push(callback);
            }
        };

        var onprogress = function(callback) {
            onprogress_callbacks.push(callback);
        };

        var resource_count_for_progress = 0;
        var progressbar = null;
        var insertProgressbar = function() {
            resource_count_for_progress = resource_loaded_count;
            document.body.appendChild(progressbar.container);
            centerProgressbar();
            setTimeout(function() {
                if (progressbar && !progressbar.finished) {
                    progressbar.container.style.display = '';
                }
            }, 250);
            observe(window, 'resize', centerProgressbar);
            stopObserving(window, 'load', insertProgressbar);
        };

        var centerProgressbar = function() {
            var winsize = windowSize();
            var hide = false;
            if (progressbar.container.style.display === "none") {
                hide = true;
                progressbar.container.style.visibility = 'hidden';
                progressbar.container.style.display = '';
            }
            var width = progressbar.container.offsetWidth;
            var height = progressbar.container.offsetHeight;
            var labelHeight = progressbar.label.offsetHeight;
            if (hide) {
                progressbar.container.style.display = 'none';
                progressbar.container.style.visibility = '';
            }
            progressbar.container.style.left = Math.round((winsize.width - width) * 0.5) + 'px';
            progressbar.container.style.top = Math.round((winsize.height - height) * 0.5) + 'px';
            progressbar.label.style.top = Math.round((height - labelHeight) * 0.5) + 'px';
        };

        onprogress(function(resource_loaded_count, resource_count, url) {
            if (showLoadProgress || progressbar) {
                if (!progressbar) {
                    progressbar = {
                        bar: tag('div', {
                            style: {
                                margin: '0',
                                padding: '0',
                                borderStyle: 'none',
                                width: '0',
                                height: '100%',
                                background: '#9BD6F4',
                                MozBorderRadius: '5px',
                                borderRadius: '5px'
                            },
                            id: 'pc_m_bar'
                        }),
                        label: tag('div', {
                            style: {
                                position: 'absolute',
                                margin: '0',
                                padding: '0',
                                borderStyle: 'none',
                                top: '0px',
                                left: '0px',
                                width: '100%',
                                textAlign: 'center'
                            },
                            id: 'pc_m_label'
                        })
                    };
                    progressbar.barcontainer = tag('div', {
                        style: {
                            margin: '0',
                            padding: '0',
                            borderStyle: 'none',
                            width: '100%',
                            height: '100%',
                            background: '#D8D8D8',
                            MozBorderRadius: '5px',
                            borderRadius: '5px'
                        },
                        id: 'pc_m_barcontainer'
                    }, progressbar.bar);
                    progressbar.container = tag('div', {
                        style: {
                            position: 'fixed',
                            width: '450px',
                            height: '30px',
                            background: 'white',
                            padding: '10px',
                            margin: '0',
                            MozBorderRadius: '5px',
                            borderRadius: '5px',
                            color: '#294256',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            opacity: '0.9',
                            display: 'none',
                            boxShadow: "2px 2px 12px rgba(0,0,0,0.4)",
                            MozBoxShadow: "2px 2px 12px rgba(0,0,0,0.4)"
                        },
                        id: 'pc_m_container',
                        onclick: function() {
                            if (progressbar) {
                                progressbar.container.style.display = 'none';
                            }
                        }
                    }, progressbar.barcontainer, progressbar.label);
                }

                if (progressbar.container.style.display === 'none') {
                    resource_count_for_progress = resource_loaded_count;
                }

                progressbar.finished = resource_loaded_count === resource_count;

                var loaded = resource_loaded_count - resource_count_for_progress;
                var count = resource_count - resource_count_for_progress;
                var progress = count === 0 ? 1.0 : loaded / count;
                progressbar.bar.style.width = Math.round(progress * 450) + 'px';
                progressbar.label.innerHTML = format('Loading Ponies&hellip; %d%%', Math.floor(progress * 100));

                if (!progressbar.container.parentNode) {
                    if (document.body) {
                        insertProgressbar();
                    } else {
                        observe(window, 'load', insertProgressbar);
                    }
                }

                if (progressbar.finished) {
                    setTimeout(function() {
                        stopObserving(window, 'resize', centerProgressbar);
                        stopObserving(window, 'load', insertProgressbar);
                        if (progressbar && progressbar.container && progressbar.container.parentNode) {
                            progressbar.container.parentNode.removeChild(progressbar.container);
                        }
                        progressbar = null;
                    }, 500);
                }
            }
        });

        var Pony = function Pony(pony) {
            this.baseurl = pony.baseurl || "";
            if (!pony.name) {
                throw new Error('pony with following base URL has no name: ' + this.baseurl);
            }
            this.name = pony.name;
            this.behaviorgroups = pony.behaviorgroups || {};
            this.all_behaviors = [];
            this.random_behaviors = [];
            this.mouseover_behaviors = [];
            this.dragged_behaviors = [];
            this.stand_behaviors = [];
            this.behaviors_by_name = {};
            this.speeches = [];
            this.random_speeches = [];
            this.speeches_by_name = {};
            this.interactions = [];
            this.instances = [];
            this.categories = [];

            if (pony.categories) {
                for (var i = 0, n = pony.categories.length; i < n; ++i) {
                    this.categories.push(pony.categories[i].toLowerCase());
                }
            }

            if (pony.speeches) {
                for (var i = 0, n = pony.speeches.length; i < n; ++i) {
                    var speech = extend({}, pony.speeches[i]);
                    if (speech.files) {
                        var count = 0;
                        for (var type in speech.files) {
                            speech.files[type] = this.baseurl + speech.files[type];
                            ++count;
                        }
                        if (count === 0) {
                            delete speech.files;
                        }
                    }
                    if (speech.name) {
                        var lowername = speech.name.toLowerCase();
                        if (has(this.speeches_by_name, lowername)) {
                            if (tinydebugBrowserPonies == true) {
                                console.warn(format("%s: Speech name %s of pony %s is not unique.",
                                    this.baseurl, speech.name, pony.name));
                            }
                        } else {
                            this.speeches_by_name[lowername] = speech;
                        }
                    }
                    if (!('skip' in speech)) {
                        speech.skip = false;
                    }
                    if (!speech.skip) {
                        this.random_speeches.push(speech);
                    }
                    if ('group' in speech) {
                        if (speech.group !== 0 && !has(this.behaviorgroups, speech.group)) {
                            if (tinydebugBrowserPonies == true) {
                                console.warn(format("%s: Speech %s references unknown behavior group %d.",
                                    this.baseurl, speech.name, speech.group));
                            }
                        }
                    } else {
                        speech.group = 0;
                    }
                    this.speeches.push(speech);
                }
            }

            var speakevents = ['speakstart', 'speakend'];
            if ('behaviors' in pony) {
                for (var i = 0, n = pony.behaviors.length; i < n; ++i) {
                    var behavior = new Behavior(this.baseurl, pony.behaviors[i]);
                    var lowername = behavior.name.toLowerCase();
                    if (has(this.behaviors_by_name, lowername)) {
                        if (tinydebugBrowserPonies == true) {
                            console.warn(format("%s: Behavior name %s of pony %s is not unique.",
                                this.baseurl, behavior.name, pony.name));
                        }
                    } else {
                        // semantics like Dektop Ponies where the
                        // first match is used for linked behaviors
                        this.behaviors_by_name[lowername] = behavior;
                    }
                    for (var j = 0; j < speakevents.length; ++j) {
                        var speakevent = speakevents[j];
                        var speechname = behavior[speakevent];
                        if (speechname) {
                            speechname = speechname.toLowerCase();
                            if (has(this.speeches_by_name, speechname)) {
                                behavior[speakevent] = this.speeches_by_name[speechname];
                            } else {
                                if (tinydebugBrowserPonies == true) {
                                    console.warn(format("%s: Behavior %s of pony %s references non-existing speech %s.",
                                        this.baseurl, behavior.name, pony.name, behavior[speakevent]));
                                }
                                delete behavior[speakevent];
                            }
                        }
                    }
                    this.all_behaviors.push(behavior);
                    if (!('skip' in behavior)) {
                        behavior.skip = false;
                    }
                    if (!behavior.skip) this.random_behaviors.push(behavior);

                    switch (behavior.movement) {
                        case AllowedMoves.MouseOver:
                            this.mouseover_behaviors.push(behavior);
                            if (!behavior.skip) this.stand_behaviors.push(behavior);
                            break;

                        case AllowedMoves.Dragged:
                            this.dragged_behaviors.push(behavior);
                            if (!behavior.skip) this.stand_behaviors.push(behavior);
                            break;

                        case AllowedMoves.None:
                            if (!behavior.skip) this.stand_behaviors.push(behavior);
                            break;
                    }

                    if ('group' in behavior) {
                        if (behavior.group !== 0 && !has(this.behaviorgroups, behavior.group)) {
                            if (tinydebugBrowserPonies == true) {
                                console.warn(format("%s: Behavior %s references unknown behavior group %d.",
                                    this.baseurl, behavior.name, behavior.group));
                            }
                        }
                    } else {
                        behavior.group = 0;
                    }
                }

                if (this.dragged_behaviors.length === 0 && this.mouseover_behaviors.length > 0) {
                    this.dragged_behaviors = this.mouseover_behaviors.slice();
                }

                if (this.stand_behaviors.length === 0) {
                    for (var i = 0, n = this.all_behaviors.length; i < n; ++i) {
                        var behavior = this.all_behaviors[i];
                        if (behavior.movement === AllowedMoves.Sleep && !behavior.skip) {
                            this.stand_behaviors.push(behavior);
                        }
                    }
                }

                if (this.stand_behaviors.length === 0) {
                    if (tinydebugBrowserPonies == true) {
                        console.warn(format("%s: Pony %s has no (non-skip) non-moving behavior.", this.baseurl, this.name));
                    }
                } else if (this.mouseover_behaviors.length === 0) {
                    this.mouseover_behaviors = this.stand_behaviors.slice();
                }

                // dereference linked behaviors:
                for (var i = 0, n = this.all_behaviors.length; i < n; ++i) {
                    var behavior = this.all_behaviors[i];
                    behavior.deref('linked', this);
                    behavior.deref('stopped', this);
                    behavior.deref('moving', this);
                }
            }
        };

        Pony.prototype = {
            preload: function() {
                for (var i = 0, n = this.all_behaviors.length; i < n; ++i) {
                    this.all_behaviors[i].preload();
                }

                if (HasAudio && audioEnabled) {
                    for (var i = 0, n = this.speeches.length; i < n; ++i) {
                        var speech = this.speeches[i];
                        if (speech.files) {
                            preloadAudio(speech.files);
                        }
                    }
                }
            },
            unspawnAll: function() {
                while (this.instances.length > 0) {
                    this.instances[0].unspawn();
                }
            },
            addInteraction: function(interaction) {
                interaction = new Interaction(interaction);

                if (interaction.targets.length === 0) {
                    if (tinydebugBrowserPonies == true) {
                        console.warn("Dropping interaction " + interaction.name + " of pony " + this.name +
                            " because it has no targets.");
                    }
                    return false;
                }

                for (var i = 0; i < interaction.behaviors.length;) {
                    var behavior = interaction.behaviors[i];
                    if (has(this.behaviors_by_name, behavior)) {
                        ++i;
                    } else {
                        interaction.behaviors.splice(i, 1);
                    }
                }

                if (interaction.behaviors.length === 0) {
                    if (tinydebugBrowserPonies == true) {
                        console.warn("Dropping interaction " + interaction.name + " of pony " + this.name +
                            " because it has no common behaviors.");
                    }
                    return false;
                }

                this.interactions.push(interaction);
                return true;
            }
        };

        var descendantOf = function(child, parent) {
            var node = child.parentNode;
            while (node) {
                if (node === parent) {
                    return true;
                }
            }
            return false;
        };

        var isOffscreen = function(rect) {
            return isOutsideOf(rect, windowSize());
        };

        // rect has origin at center
        // area is only a size
        var isOutsideOf = function(rect, area) {
            var wh = rect.width * 0.5;
            var hh = rect.height * 0.5;
            return rect.x < wh || rect.y < hh ||
                rect.x + wh > area.width ||
                rect.y + hh > area.height;
        };

        var clipToScreen = function(rect) {
            var winsize = windowSize();
            var x = rect.x;
            var y = rect.y;
            var wh = rect.width * 0.5;
            var hh = rect.height * 0.5;

            if (x < wh) {
                x = wh;
            } else if (x + wh > winsize.width) {
                x = winsize.width - wh;
            }

            if (y < hh) {
                y = hh;
            } else if (y + hh > winsize.height) {
                y = winsize.height - hh;
            }

            return { x: Math.round(x), y: Math.round(y) };
        };

        var Instance = function Instance() {};
        Instance.prototype = {
            setTopLeftPosition: function(pos) {
                this.current_position.x = pos.x + this.current_center.x;
                this.current_position.y = pos.y + this.current_center.y;
                this.img.style.left = Math.round(pos.x) + 'px';
                this.img.style.top = Math.round(pos.y) + 'px';
                var zIndex = Math.round(BaseZIndex + pos.y + this.current_size.height);
                if (this.zIndex !== zIndex) {
                    this.img.style.zIndex = zIndex;
                }
            },
            setPosition: function(pos) {
                var x = this.current_position.x = pos.x;
                var y = this.current_position.y = pos.y;
                var top = Math.round(y - this.current_center.y);
                this.img.style.left = Math.round(x - this.current_center.x) + 'px';
                this.img.style.top = top + 'px';
                var zIndex = Math.round(BaseZIndex + top + this.current_size.height);
                if (this.zIndex !== zIndex) {
                    this.img.style.zIndex = zIndex;
                }
            },
            moveBy: function(offset) {
                this.setPosition({
                    x: this.current_position.x + offset.x,
                    y: this.current_position.y + offset.y
                });
            },
            clipToScreen: function() {
                this.setPosition(clipToScreen(this.rect()));
            },
            topLeftPosition: function() {
                return {
                    x: this.current_position.x - this.current_center.x,
                    y: this.current_position.y - this.current_center.y
                };
            },
            position: function() {
                return this.current_position;
            },
            size: function() {
                return this.current_size;
            },
            rect: function() {
                // lets abuse for speed (avoid object creation)
                var pos = this.current_position;
                pos.width = this.current_size.width;
                pos.height = this.current_size.height;
                return pos;

                //			var pos  = this.position();
                //			var size = this.size();
                //			return {
                //				x: pos.x,
                //				y: pos.y,
                //				width:  size.width,
                //				height: size.height
                //			};
            },
            topLeftRect: function() {
                var pos = this.topLeftPosition();
                var size = this.size();
                return {
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height
                };
            },
            isOffscreen: function() {
                return isOffscreen(this.rect());
            }
        };

        var PonyInstance = function PonyInstance(pony) {
            this.pony = pony;
            this.img = this.createImage();

            this.clear();
        };

        PonyInstance.prototype = extend(new Instance(), {
            createImage: function() {
                var touch = function(evt) {
                    evt.preventDefault();
                    if (evt.touches.length > 1 || (evt.type === "touchend" && evt.touches.length > 0))
                        return;

                    var newEvt = document.createEvent("MouseEvents");
                    var type = null;
                    var touch = null;
                    switch (evt.type) {
                        case "touchstart":
                            type = "mousedown";
                            touch = evt.changedTouches[0];
                            break;
                        case "touchmove":
                            type = "mousemove";
                            touch = evt.changedTouches[0];
                            break;
                        case "touchend":
                            type = "mouseup";
                            touch = evt.changedTouches[0];
                            break;
                    }
                    newEvt.initMouseEvent(type, true, true, evt.target.ownerDocument.defaultView, 1,
                        touch.screenX, touch.screenY, touch.clientX, touch.clientY,
                        evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, 0, null);
                    evt.target.dispatchEvent(newEvt);
                };
                return tag('img', {
                    draggable: 'false',
                    style: {
                        position: "fixed",
                        userSelect: "none",
                        borderStyle: "none",
                        margin: "0",
                        padding: "0",
                        backgroundColor: "transparent",
                        zIndex: String(BaseZIndex)
                    },
                    ondragstart: function(event) {
                        event.preventDefault();
                    },
                    ontouchstart: touch,
                    ontouchmove: touch,
                    ontouchend: touch,
                    ondblclick: function() {
                        // debug output
                        var pos = this.position();
                        var duration = (this.end_time - this.start_time) / 1000;
                        if (tinydebugBrowserPonies == true) {
                            console.log(
                                format('%s does %s%s for %.2f seconds, is at %d x %d and %s. See:',
                                    this.pony.name, this.current_behavior.name,
                                    this.current_behavior === this.paint_behavior ? '' :
                                    ' using ' + this.paint_behavior.name, duration, pos.x, pos.y,
                                    (this.following ?
                                        'follows ' + this.following.name() :
                                        format('wants to go to %d x %d',
                                            this.dest_position.x, this.dest_position.y))),
                                this);
                        }
                    }.bind(this),
                    onmousedown: function(event) {
                        // IE 9 supports event.buttons and handles event.button like the w3c says.
                        // IE <9 does not support event.buttons but sets event.button to the value
                        // event.buttons should have (which is not what the w3c says).
                        if ('buttons' in event ? event.buttons & 1 : (IE ? event.button & 1 : event.button === 0)) {
                            dragged = this;
                            this.mouseover = true;
                            // timer === null means paused/not running
                            if (timer !== null) {
                                this.nextBehavior(true);
                            }
                            event.preventDefault();
                        }
                    }.bind(this),
                    onmouseover: function() {
                        if (!this.mouseover) {
                            this.mouseover = true;
                            // timer === null means paused/not runnung
                            if (timer !== null &&
                                !this.isMouseOverOrDragging() &&
                                (this.canMouseOver() || this.canDrag())) {
                                this.nextBehavior(true);
                            }
                        }
                    }.bind(this),
                    onmouseout: function(event) {
                        var target = event.target;
                        // XXX: the img has no descendants but if it had it might still be correct in case
                        //      the relatedTarget is an anchester of the img or any node that is not a child
                        //      of img or img itself.
                        //					if (this.mouseover && (target === this.img || !descendantOf(target, this.img))) {
                        if (this.mouseover) {
                            this.mouseover = false;
                        }
                    }.bind(this)
                });
            },
            isMouseOverOrDragging: function() {
                return this.current_behavior &&
                    (this.current_behavior.movement === AllowedMoves.MouseOver ||
                        this.current_behavior.movement === AllowedMoves.Dragged);
            },
            canDrag: function() {
                if (!this.current_behavior) {
                    return this.pony.dragged_behaviors.length > 0;
                } else {
                    var current_group = this.current_behavior.group;

                    for (var i = 0, n = this.pony.dragged_behaviors.length; i < n; ++i) {
                        var behavior = this.pony.dragged_behaviors[i];
                        if (behavior.group === 0 || behavior.group === current_group) {
                            return true;
                        }
                    }

                    return false;
                }
            },
            canMouseOver: function() {
                if (!this.current_behavior) {
                    return this.pony.mouseover_behaviors.length > 0;
                } else {
                    var current_group = this.current_behavior.group;
                    for (var i = 0, n = this.pony.mouseover_behaviors.length; i < n; ++i) {
                        var behavior = this.pony.mouseover_behaviors[i];
                        if (behavior.group === 0 || behavior.group === current_group) {
                            return true;
                        }
                    }

                    return false;
                }
            },
            name: function() {
                return this.pony.name;
            },
            unspawn: function() {
                var currentTime = Date.now();
                if (this.effects) {
                    for (var i = 0, n = this.effects.length; i < n; ++i) {
                        removing.push({
                            at: currentTime,
                            element: this.effects[i].img
                        });
                    }
                }
                removing.push({
                    at: currentTime,
                    element: this.img
                });
                removeAll(this.pony.instances, this);
                removeAll(instances, this);
            },
            clear: function() {
                if (this.effects) {
                    for (var i = 0, n = this.effects.length; i < n; ++i) {
                        this.effects[i].clear();
                    }
                }
                if (this.img.parentNode) {
                    this.img.parentNode.removeChild(this.img);
                }
                this.mouseover = false;
                this.start_time = null;
                this.end_time = null;
                this.current_interaction = null;
                this.interaction_targets = null;
                this.current_imgurl = null;
                this.interaction_wait = 0;
                this.current_position = { x: 0, y: 0 };
                this.dest_position = { x: 0, y: 0 };
                this.current_size = { width: 0, height: 0 };
                this.current_center = { x: 0, y: 0 };
                this.zIndex = BaseZIndex;
                this.current_behavior = null;
                this.paint_behavior = null;
                this.facing_right = true;
                this.end_at_dest = false;
                this.effects = [];
                this.repeating = [];
            },
            interact: function(currentTime, interaction, targets) {
                var pony, behavior = randomSelect(interaction.behaviors);
                this.behave(this.pony.behaviors_by_name[behavior]);
                for (var i = 0, n = targets.length; i < n; ++i) {
                    pony = targets[i];
                    pony.behave(pony.pony.behaviors_by_name[behavior]);
                    pony.current_interaction = interaction;
                }
                this.current_interaction = interaction;
                this.interaction_targets = targets;
            },
            speak: function(currentTime, speech) {
                if (dontSpeak) return;
                if (speech.text) {
                    var duration = Math.max(speech.text.length * 150, 1000);
                    var remove = { at: currentTime + duration };
                    var text = tag('div', {
                        ondblclick: function() {
                            remove.at = Date.now();
                        },
                        style: {
                            fontSize: "14px",
                            color: "#294256",
                            background: IE ? "white" : "rgba(255,255,255,0.8)",
                            position: "fixed",
                            visibility: "hidden",
                            margin: "0",
                            padding: "4px",
                            maxWidth: "250px",
                            textAlign: "center",
                            borderRadius: "10px",
                            MozBorderRadius: "10px",
                            width: 'auto',
                            height: 'auto',
                            boxShadow: "2px 2px 12px rgba(0,0,0,0.4)",
                            MozBoxShadow: "2px 2px 12px rgba(0,0,0,0.4)",
                            zIndex: String(BaseZIndex + 9000)
                        }
                    }, speech.text);
                    remove.element = text;
                    var rect = this.topLeftRect();
                    getOverlay().appendChild(text);
                    var x = Math.round(rect.x + rect.width * 0.5 - text.offsetWidth * 0.5);
                    var y = rect.y + rect.height;
                    text.style.left = x + 'px';
                    text.style.top = y + 'px';
                    text.style.visibility = '';
                    removing.push(remove);
                    text = null;
                }
                if (HasAudio && audioEnabled && speech.files) {
                    var audio = createAudio(speech.files);
                    audio.volume = volume;
                    audio.play();
                }
            },
            update: function(currentTime, passedTime, winsize) {
                var curr = this.rect();
                var dest = null;
                var dist;
                if (this.following) {
                    if (this.following.img.parentNode) {
                        dest = this.dest_position;
                        dest.x = this.following.current_position.x;

                        if (this.following.facing_right) {
                            dest.x += this.current_behavior.x - this.following.paint_behavior.rightcenter.x;
                            //						dest.x += this.current_behavior.x - this.following.paint_behavior.rightcenter.x + 40;
                            //						dest.x += -this.following.paint_behavior.rightcenter.x + 50;
                        } else {
                            dest.x += -this.current_behavior.x + this.following.paint_behavior.leftcenter.x;
                            //						dest.x += -this.current_behavior.x + this.following.paint_behavior.leftcenter.x - 20;
                            //						dest.x += this.following.paint_behavior.leftcenter.x - 30;
                        }
                        dest.y = this.following.current_position.y + this.current_behavior.y;
                        dist = distance(curr, dest);
                        if (!this.current_behavior.x && !this.current_behavior.y &&
                            dist <= curr.width * 0.5) {
                            dest = null;
                        }
                    } else {
                        this.following = null;
                    }
                } else {
                    dest = this.dest_position;
                    if (dest) dist = distance(curr, dest);
                }

                var pos;
                if (dest) {
                    var dx = dest.x - curr.x;
                    var dy = dest.y - curr.y;
                    var tdist = this.current_behavior.speed * passedTime * 0.01 * globalSpeed;

                    if (tdist >= dist) {
                        pos = dest;
                    } else {
                        var scale = tdist / dist;
                        pos = {
                            x: Math.round(curr.x + scale * dx),
                            y: Math.round(curr.y + scale * dy)
                        };
                    }

                    if (pos.x !== dest.x) {
                        this.setFacingRight(pos.x <= dest.x);
                    } else if (this.following) {
                        if (this.current_behavior.auto_select_images) {
                            // TODO: mechanism for selecting behavior for current movement
                        } else if (Math.round(tdist) === 0) {
                            if (this.current_behavior.stopped) {
                                this.paint_behavior = this.current_behavior.stopped;
                            }
                        } else {
                            if (this.current_behavior.moving) {
                                this.paint_behavior = this.current_behavior.moving;
                            }
                        }
                        this.setFacingRight(this.following.facing_right);
                    }
                    this.setPosition(pos);
                    /*
                    				console.log(
                    					"current: "+curr.x+" x "+curr.y+
                    					", step: "+pos.x+" x "+pos.y+
                    					", dest: "+dest.x+" x "+dest.y+
                    					", dist: "+dist+
                    					", dist for passed time: "+tdist);
                    */
                } else {
                    pos = curr;
                }

                // update associated effects:
                for (var i = 0; i < this.effects.length;) {
                    var effect = this.effects[i];
                    if (effect.update(currentTime, passedTime, winsize)) {
                        ++i;
                    } else {
                        this.effects.splice(i, 1);
                        removing.push({
                            element: effect.img,
                            at: currentTime
                        });
                    }
                }

                // check if some effects need to be repeated:
                for (var i = 0, n = this.repeating.length; i < n; ++i) {
                    var what = this.repeating[i];
                    if (what.at <= currentTime) {
                        var inst = new EffectInstance(this, currentTime, what.effect);
                        overlay.appendChild(inst.img);
                        inst.updatePosition(currentTime, 0);
                        this.effects.push(inst);
                        what.at += what.effect.delay * 1000;
                    }
                }

                if (this.interaction_wait <= currentTime &&
                    this.pony.interactions.length > 0 &&
                    !this.current_interaction) {
                    var sumprob = 0;
                    var interactions = [];
                    var interaction = null;
                    for (var i = 0, n = this.pony.interactions.length; i < n; ++i) {
                        interaction = this.pony.interactions[i];
                        var targets = interaction.reachableTargets(curr);
                        if (targets) {
                            sumprob += interaction.probability;
                            interactions.push([interaction, targets]);
                        }
                    }

                    if (interactions.length > 0) {
                        var dice = Math.random() * sumprob;
                        var diceiter = 0;
                        for (var i = 0, n = interactions.length; i < n; ++i) {
                            interaction = interactions[i];
                            diceiter += interaction.probability;
                            if (dice <= diceiter) {
                                break;
                            }
                        }

                        // The probability is meant for an execution evere 100ms,
                        // but I use a configurable interaction interval.
                        dice = Math.random() * (100 / interactionInterval);
                        if (dice <= interaction[0].probability) {
                            this.interact(currentTime, interaction[0], interaction[1]);
                            return;
                        }
                    }

                    this.interaction_wait += interactionInterval;
                }

                if (currentTime >= this.end_time ||
                    (this.end_at_dest &&
                        this.dest_position.x === pos.x &&
                        this.dest_position.y === pos.y)) {
                    this.nextBehavior();
                    return;
                }

                if (this.following) return;

                var x1 = this.current_center.x;
                var y1 = this.current_center.y;
                var x2 = this.current_size.width - x1;
                var y2 = this.current_size.height - y1;
                var left = pos.x - x1;
                var right = pos.x + x2;
                var top = pos.y - y1;
                var bottom = pos.y + y2;

                // bounce of screen edges
                if (left <= 0) {
                    if (this.dest_position.x < pos.x) {
                        this.dest_position.x = Math.round(Math.max(pos.x + pos.x - this.dest_position.x, x1));
                    }
                } else if (right >= winsize.width) {
                    if (this.dest_position.x > pos.x) {
                        this.dest_position.x = Math.round(Math.min(pos.x + pos.x - this.dest_position.x, winsize.width - x2));
                    }
                }

                if (top <= 0) {
                    if (this.dest_position.y < pos.y) {
                        this.dest_position.y = Math.round(Math.max(pos.y + pos.y - this.dest_position.y, y1));
                    }
                } else if (bottom >= winsize.height) {
                    if (this.dest_position.y > pos.y) {
                        this.dest_position.y = Math.round(Math.min(pos.y + pos.y - this.dest_position.y, winsize.height - y2));
                    }
                }
            },
            getNearestInstance: function(name) {
                var nearObjects = [];
                var pos = this.position();
                var pony = ponies[name];

                if (!pony) {
                    for (var i = 0, n = instances.length; i < n; ++i) {
                        var inst = instances[i];
                        if (!this.loops(inst)) {
                            for (var j = 0, m = inst.effects.length; j < m; ++j) {
                                var effect = inst.effects[j];
                                if (effect.effect.name === name) {
                                    nearObjects.push([distance(pos, effect.position()), effect]);
                                }
                            }
                        }
                    }
                } else {
                    for (var i = 0, n = pony.instances.length; i < n; ++i) {
                        var inst = pony.instances[i];
                        if (!this.loops(inst)) {
                            nearObjects.push([distance(pos, inst.position()), inst]);
                        }
                    }
                }

                if (nearObjects.length === 0) {
                    return null;
                }
                nearObjects.sort(function(lhs, rhs) { return lhs[0] - rhs[0]; });
                return nearObjects[0][1];
            },
            nextBehavior: function(breaklink) {
                var offscreen = this.isOffscreen();
                if (!breaklink && this.current_behavior && this.current_behavior.linked) {
                    this.behave(this.current_behavior.linked, offscreen);
                } else {
                    if (this.current_interaction) {
                        var currentTime = Date.now();
                        this.interaction_wait = currentTime + this.current_interaction.delay * 1000;
                        if (this.interaction_targets) {
                            // XXX: should I even do this or should I just let the targets do it?
                            //      they do it anyway, because current_interaction is also set for them
                            //      if it wouldn't be set, they could break out of interactions
                            for (var i = 0, n = this.interaction_targets.length; i < n; ++i) {
                                this.interaction_targets[i].interaction_wait = this.interaction_wait;
                            }
                            this.interaction_targets = null;
                        }
                        this.current_interaction = null;
                    }

                    this.behave(this.randomBehavior(offscreen), offscreen);
                }
            },
            setFacingRight: Gecko ?
                function(value) {
                    this.facing_right = value;
                    var newimg;
                    if (value) {
                        newimg = this.paint_behavior.rightimage;
                        this.current_size = this.paint_behavior.rightsize;
                        this.current_center = this.paint_behavior.rightcenter;
                    } else {
                        newimg = this.paint_behavior.leftimage;
                        this.current_size = this.paint_behavior.leftsize;
                        this.current_center = this.paint_behavior.leftcenter;
                    }
                    if (newimg !== this.current_imgurl) {
                        // gif animation bug workaround
                        var img = this.createImage();
                        img.style.left = this.img.style.left;
                        img.style.top = this.img.style.top;
                        img.style.zIndex = this.img.style.zIndex;
						this.current_imgurl = newimg;
                        img.src = browser.runtime.getURL(this.current_imgurl);
                        this.img.parentNode.replaceChild(img, this.img);
                        this.img = img;
                    }
                } : function(value) {
                    this.facing_right = value;
                    var newimg;
                    if (value) {
                        newimg = this.paint_behavior.rightimage;
                        this.current_size = this.paint_behavior.rightsize;
                        this.current_center = this.paint_behavior.rightcenter;
                    } else {
                        newimg = this.paint_behavior.leftimage;
                        this.current_size = this.paint_behavior.leftsize;
                        this.current_center = this.paint_behavior.leftcenter;
                    }
                    if (newimg !== this.current_imgurl) {
						this.current_imgurl = newimg;
                        this.img.src = browser.runtime.getURL(this.current_imgurl);
                    }
                },
            behave: function(behavior, moveIntoScreen) {
                this.start_time = Date.now();
                var duration = (behavior.minduration +
                    (behavior.maxduration - behavior.minduration) * Math.random());
                this.end_time = this.start_time + duration * 1000;
                var previous_behavior = this.current_behavior;
                this.current_behavior = this.paint_behavior = behavior;

                var neweffects = [];
                for (var i = 0, n = this.effects.length; i < n; ++i) {
                    var inst = this.effects[i];
                    if (inst.effect.duration) {
                        neweffects.push(inst);
                    } else {
                        removing.push({
                            element: inst.img,
                            at: this.start_time
                        });
                    }
                }

                // get new image + size
                if (this.facing_right) {
                    this.current_size = this.paint_behavior.rightsize;
                    this.current_center = this.paint_behavior.rightcenter;
                } else {
                    this.current_size = this.paint_behavior.leftsize;
                    this.current_center = this.paint_behavior.leftcenter;
                }

                var spoke = false;
                if (previous_behavior && previous_behavior.speakend) {
                    this.speak(this.start_time, previous_behavior.speakend);
                    spoke = true;
                }

                this.following = null;
                if (behavior.follow) {
                    this.following = this.getNearestInstance(behavior.follow);
                }

                if (behavior.speakstart) {
                    this.speak(this.start_time, behavior.speakstart);
                } else if (!spoke &&
                    !this.following &&
                    !this.current_interaction) {
                    this.speakRandom(this.start_time, speakProbability);
                }

                var pos = this.position();
                var size = this.size();
                var winsize = windowSize();
                this.end_at_dest = false;
                if (this.following) {
                    this.dest_position.x = this.following.current_position.x;
                    this.dest_position.y = this.following.current_position.y;
                } else if (!behavior.follow && (behavior.x || behavior.y)) {
                    this.end_at_dest = true;
                    this.dest_position = {
                        x: Math.round((winsize.width - size.width) * (behavior.x || 0) / 100),
                        y: Math.round((winsize.height - size.height) * (behavior.y || 0) / 100)
                    };
                } else {
                    // reduce chance of going off-screen
                    var movements = null;
                    switch (behavior.movement) {
                        case AllowedMoves.HorizontalOnly:
                            movements = [Movements.Left, Movements.Right];
                            break;

                        case AllowedMoves.VerticalOnly:
                            movements = [Movements.Up, Movements.Down];
                            break;

                        case AllowedMoves.HorizontalVertical:
                            movements = [Movements.Left, Movements.Right,
                                Movements.Up, Movements.Down
                            ];
                            break;

                        case AllowedMoves.DiagonalOnly:
                            movements = [Movements.UpLeft, Movements.UpRight,
                                Movements.DownLeft, Movements.DownRight
                            ];
                            break;

                        case AllowedMoves.DiagonalHorizontal:
                            movements = [Movements.Left, Movements.Right,
                                Movements.UpLeft, Movements.UpRight,
                                Movements.DownLeft, Movements.DownRight
                            ];
                            break;

                        case AllowedMoves.DiagonalVertical:
                            movements = [Movements.Up, Movements.Down,
                                Movements.UpLeft, Movements.UpRight,
                                Movements.DownLeft, Movements.DownRight
                            ];
                            break;

                        case AllowedMoves.All:
                            movements = [Movements.Left, Movements.Right,
                                Movements.Up, Movements.Down,
                                Movements.UpLeft, Movements.UpRight,
                                Movements.DownLeft, Movements.DownRight
                            ];
                            break;
                    }

                    if (movements === null) {
                        this.dest_position.x = Math.round(pos.x);
                        this.dest_position.y = Math.round(pos.y);
                    } else {
                        var nearTop = pos.y - size.height * 0.5 < 100;
                        var nearBottom = pos.y + size.height * 0.5 + 100 > winsize.height;
                        var nearLeft = pos.x - size.width * 0.5 < 100;
                        var nearRight = pos.x + size.width * 0.5 + 100 > winsize.width;
                        var reducedMovements = movements.slice();

                        if (nearTop) {
                            removeAll(reducedMovements, Movements.Up);
                            removeAll(reducedMovements, Movements.UpLeft);
                            removeAll(reducedMovements, Movements.UpRight);
                        }

                        if (nearBottom) {
                            removeAll(reducedMovements, Movements.Down);
                            removeAll(reducedMovements, Movements.DownLeft);
                            removeAll(reducedMovements, Movements.DownRight);
                        }

                        if (nearLeft) {
                            removeAll(reducedMovements, Movements.Left);
                            removeAll(reducedMovements, Movements.UpLeft);
                            removeAll(reducedMovements, Movements.DownLeft);
                        }

                        if (nearRight) {
                            removeAll(reducedMovements, Movements.Right);
                            removeAll(reducedMovements, Movements.UpRight);
                            removeAll(reducedMovements, Movements.DownRight);
                        }

                        // speed is in pixels/100ms, duration is in sec
                        var dist = behavior.speed * duration * 100 * globalSpeed;

                        var a;
                        switch (randomSelect(reducedMovements.length === 0 ? movements : reducedMovements)) {
                            case Movements.Up:
                                this.dest_position = {
                                    x: pos.x,
                                    y: pos.y - dist
                                };
                                break;
                            case Movements.Down:
                                this.dest_position = {
                                    x: pos.x,
                                    y: pos.y + dist
                                };
                                break;
                            case Movements.Left:
                                this.dest_position = {
                                    x: pos.x - dist,
                                    y: pos.y
                                };
                                break;
                            case Movements.Right:
                                this.dest_position = {
                                    x: pos.x + dist,
                                    y: pos.y
                                };
                                break;
                            case Movements.UpLeft:
                                a = Math.sqrt(dist * dist * 0.5);
                                this.dest_position = {
                                    x: pos.x - a,
                                    y: pos.y - a
                                };
                                break;
                            case Movements.UpRight:
                                a = Math.sqrt(dist * dist * 0.5);
                                this.dest_position = {
                                    x: pos.x + a,
                                    y: pos.y - a
                                };
                                break;
                            case Movements.DownLeft:
                                a = Math.sqrt(dist * dist * 0.5);
                                this.dest_position = {
                                    x: pos.x - a,
                                    y: pos.y + a
                                };
                                break;
                            case Movements.DownRight:
                                a = Math.sqrt(dist * dist * 0.5);
                                this.dest_position = {
                                    x: pos.x + a,
                                    y: pos.y + a
                                };
                                break;
                        }

                        if (moveIntoScreen) {
                            this.dest_position = clipToScreen(extend(this.dest_position, size));
                            this.end_at_dest = true;
                        } else {
                            // clipToScreen already rounds
                            this.dest_position.x = Math.round(this.dest_position.x);
                            this.dest_position.y = Math.round(this.dest_position.y);
                        }
                    }
                }

                // this changes the image to the new behavior:
                this.setFacingRight(
                    pos.x !== this.dest_position.x ?
                    pos.x <= this.dest_position.x :
                    this.facing_right);

                // this initializes the new images position:
                // (alternatively maybe this.update(...) could be called?)
                this.setPosition(this.current_position);

                var overlay = getOverlay();
                this.repeating = [];
                for (var i = 0, n = behavior.effects.length; i < n; ++i) {
                    var effect = behavior.effects[i];
                    var inst = new EffectInstance(this, this.start_time, effect);
                    overlay.appendChild(inst.img);
                    inst.updatePosition(this.start_time, 0);
                    neweffects.push(inst);

                    if (effect.delay) {
                        this.repeating.push({
                            effect: effect,
                            at: this.start_time + effect.delay * 1000
                        });
                    }
                }
                this.effects = neweffects;
                /*
                			var msg;
                			if (this.following) {
                				msg = "following "+behavior.follow;
                			}
                			else {
                				if (this.dest_position.x !== pos.x || this.dest_position.y !== pos.y) {
                					msg = "move from "+pos.x+" x "+pos.y+" to "+
                						Math.round(this.dest_position.x)+" x "+
                						Math.round(this.dest_position.y);
                				}
                				else {
                					msg = "no movement";
                				}

                				if (behavior.follow) {
                					msg += " (wanted to follow "+behavior.follow+")";
                				}
                			}
                			console.log(this.pony.name+" does "+behavior.name+": "+msg+" in "+duration+
                				" seconds");
                */
            },
            teleport: function() {
                var winsize = windowSize();
                var size = this.size();
                this.setTopLeftPosition({
                    x: Math.random() * (winsize.width - size.width),
                    y: Math.random() * (winsize.height - size.height)
                });
            },
            speakRandom: function(start_time, speak_probability) {
                if (Math.random() >= speak_probability) return;
                var filtered = [];
                var current_group = this.current_behavior.group;
                for (var i = 0, n = this.pony.random_speeches.length; i < n; ++i) {
                    var speech = this.pony.random_speeches[i];
                    if (speech.group === 0 || speech.group === current_group) {
                        filtered.push(speech);
                    }
                }
                if (filtered.length > 0) {
                    this.speak(start_time, randomSelect(filtered));
                }
            },
            randomBehavior: function(forceMovement) {
                var behaviors;
                var current_group = this.current_behavior ? this.current_behavior.group : 0;

                if (this === dragged && this.canDrag()) {
                    behaviors = this.pony.dragged_behaviors;
                } else if (this.mouseover && this.canMouseOver()) {
                    behaviors = this.pony.mouseover_behaviors;
                } else {
                    behaviors = this.pony.random_behaviors;
                }

                var sumprob = 0;
                var filtered = [];
                for (var i = 0, n = behaviors.length; i < n; ++i) {
                    var behavior = behaviors[i];
                    // don't filter looping behaviors because getNearestInstance filteres
                    // looping instances and then it just degrades to a standard behavior
                    if (forceMovement && !behavior.isMoving()) continue;
                    if (current_group !== 0 && behavior.group !== 0 && behavior.group !== current_group) continue;
                    sumprob += behavior.probability;
                    filtered.push(behavior);
                }
                var dice = Math.random() * sumprob;
                var diceiter = 0;
                for (var i = 0, n = filtered.length; i < n; ++i) {
                    var behavior = filtered[i];
                    diceiter += behavior.probability;
                    if (dice <= diceiter) {
                        return behavior;
                    }
                }
                return forceMovement ? this.randomBehavior(false) : null;
            },
            loops: function(instance) {
                while (instance) {
                    if (this === instance) return true;
                    instance = instance.following;
                }
                return false;
            }
        });

        var EffectInstance = function EffectInstance(pony, start_time, effect) {
            this.pony = pony;
            this.start_time = start_time;
            var duration = effect.duration * 1000;
            // XXX: Gecko gif animations speed is buggy!
            if (Gecko) duration *= 0.6;
            duration = Math.max(duration - fadeDuration, fadeDuration);
            this.end_time = start_time + duration;
            this.effect = effect;

            var imgurl;
            if (pony.facing_right) {
                imgurl = this.effect.rightimage;
                this.current_size = this.effect.rightsize;
                this.current_center = this.effect.rightcenter_point;
            } else {
                imgurl = this.effect.leftimage;
                this.current_size = this.effect.leftsize;
                this.current_center = this.effect.leftcenter_point;
            }
            this.current_position = { x: 0, y: 0 };
            this.zIndex = BaseZIndex;

            this.current_imgurl = null;
            this.img = this.createImage(imgurl);

            var locs = ['rightloc', 'rightcenter', 'leftloc', 'leftcenter'];
            for (var i = 0, n = locs.length; i < n; ++i) {
                var name = locs[i];
                var loc = effect[name];

                if (loc === Locations.Any) {
                    loc = randomSelect([
                        Locations.Top, Locations.Bottom, Locations.Left, Locations.Right,
                        Locations.BottomRight, Locations.BottomLeft, Locations.TopRight, Locations.TopLeft,
                        Locations.Center
                    ]);
                } else if (loc === Locations.AnyNotCenter) {
                    loc = randomSelect([
                        Locations.Top, Locations.Bottom, Locations.Left, Locations.Right,
                        Locations.BottomRight, Locations.BottomLeft, Locations.TopRight, Locations.TopLeft
                    ]);
                }

                this[name] = loc;
            }
        };

        EffectInstance.prototype = extend(new Instance(), {
            createImage: function(src) {
                var img = tag('img', {
                    src: browser.runtime.getURL(src),
                    draggable: 'false',
                    style: {
                        position: "fixed",
                        overflow: "hidden",
                        userSelect: "none",
                        pointerEvents: "none",
                        borderStyle: "none",
                        margin: "0",
                        padding: "0",
                        backgroundColor: "transparent",
                        width: this.current_size.width + "px",
                        height: this.current_size.height + "px",
                        zIndex: String(BaseZIndex)
                    }
                });
                if (IE) {
                    img.setAttribute("scrolling", "no");
                    img.setAttribute("frameborder", "0");
                    img.setAttribute("marginheight", "0");
                    img.setAttribute("marginwidth", "0");
                }
                return img;
            },
            name: function() {
                return this.effect.name;
            },
            clear: function() {
                if (this.img.parentNode) {
                    this.img.parentNode.removeChild(this.img);
                }
            },
            updatePosition: function(currentTime, passedTime) {
                var loc, center;
                if (this.pony.facing_right) {
                    loc = this.rightloc;
                    center = this.rightcenter;
                } else {
                    loc = this.leftloc;
                    center = this.leftcenter;
                }

                var size = this.size();
                var pos;

                switch (center) {
                    case Locations.Top:
                        pos = { x: -size.width * 0.5, y: 0 };
                        break;
                    case Locations.Bottom:
                        pos = { x: -size.width * 0.5, y: -size.height };
                        break;
                    case Locations.Left:
                        pos = { x: 0, y: -size.height * 0.5 };
                        break;
                    case Locations.Right:
                        pos = { x: -size.width, y: -size.height * 0.5 };
                        break;
                    case Locations.BottomRight:
                        pos = { x: -size.width, y: -size.height };
                        break;
                    case Locations.BottomLeft:
                        pos = { x: 0, y: -size.height };
                        break;
                    case Locations.TopRight:
                        pos = { x: -size.width, y: 0 };
                        break;
                    case Locations.TopLeft:
                        pos = { x: 0, y: 0 };
                        break;
                    case Locations.Center:
                        pos = { x: -size.width * 0.5, y: -size.height * 0.5 };
                        break;
                }

                var ponyRect = this.pony.topLeftRect();
                switch (loc) {
                    case Locations.Top:
                        pos.x += ponyRect.x + ponyRect.width * 0.5;
                        pos.y += ponyRect.y;
                        break;
                    case Locations.Bottom:
                        pos.x += ponyRect.x + ponyRect.width * 0.5;
                        pos.y += ponyRect.y + ponyRect.height;
                        break;
                    case Locations.Left:
                        pos.x += ponyRect.x;
                        pos.y += ponyRect.y + ponyRect.height * 0.5;
                        break;
                    case Locations.Right:
                        pos.x += ponyRect.x + ponyRect.width;
                        pos.y += ponyRect.y + ponyRect.height * 0.5;
                        break;
                    case Locations.BottomRight:
                        pos.x += ponyRect.x + ponyRect.width;
                        pos.y += ponyRect.y + ponyRect.height;
                        break;
                    case Locations.BottomLeft:
                        pos.x += ponyRect.x;
                        pos.y += ponyRect.y + ponyRect.height;
                        break;
                    case Locations.TopRight:
                        pos.x += ponyRect.x + ponyRect.width;
                        pos.y += ponyRect.y;
                        break;
                    case Locations.TopLeft:
                        pos.x += ponyRect.x;
                        pos.y += ponyRect.y;
                        break;
                    case Locations.Center:
                        pos.x += ponyRect.x + ponyRect.width * 0.5;
                        pos.y += ponyRect.y + ponyRect.height * 0.5;
                        break;
                }

                this.setTopLeftPosition(pos);
            },

            setImage: Gecko ?
                function(url) {
                    if (this.current_imgurl !== url) {
                        // gif animation bug workaround
                        var img = this.createImage(url);
                        img.style.left = this.img.style.left;
                        img.style.top = this.img.style.top;
                        img.style.zIndex = this.img.style.zIndex;
                        this.current_imgurl = url;
                        this.img.parentNode.replaceChild(img, this.img);
                        this.img = img;
                    }
                } : function(url) {
                    if (this.current_imgurl !== url) {
						this.current_imgurl = url;
                        this.img.src = browser.runtime.getURL(this.current_imgurl);

                        this.img.style.width = this.current_size.width + "px";
                        this.img.style.height = this.current_size.height + "px";
                    }
                },
            update: function(currentTime, passedTime, winsize) {
                if (this.effect.follow) {
                    this.updatePosition(currentTime, passedTime);

                    var imgurl;
                    if (this.pony.facing_right) {
                        imgurl = this.effect.rightimage;
                        this.current_size = this.effect.rightsize;
                        this.current_center = this.effect.rightcenter_point;
                    } else {
                        imgurl = this.effect.leftimage;
                        this.current_size = this.effect.leftsize;
                        this.current_center = this.effect.leftcenter_point;
                    }
                    this.setImage(imgurl);
                }
                return !this.effect.duration || currentTime < this.end_time;
            }
        });

        var lastTime = Date.now();
        var tick = function() {
            if (timer === null) return;
            var currentTime = Date.now();
            var timeSpan = currentTime - lastTime;
            var winsize = windowSize();

            for (var i = 0, n = instances.length; i < n; ++i) {
                instances[i].update(currentTime, timeSpan, winsize);
            }

            // check if something needs to be removed:
            for (var i = 0; i < removing.length;) {
                var what = removing[i];
                if (what.at + fadeDuration <= currentTime) {
                    if (what.element.parentNode) {
                        what.element.parentNode.removeChild(what.element);
                    }
                    removing.splice(i, 1);
                } else {
                    if (what.at <= currentTime) {
                        setOpacity(what.element, 1 - (currentTime - what.at) / fadeDuration);
                    }
                    ++i;
                }
            }

            if (showFps) {
                if (!fpsDisplay) {
                    var overlay = getOverlay();
                    fpsDisplay = tag('div', {
                        style: {
                            fontSize: '18px',
                            position: 'fixed',
                            bottom: '0',
                            left: '0',
                            zIndex: String(BaseZIndex + 9001)
                        }
                    });
                    overlay.appendChild(fpsDisplay);
                }

                fpsDisplay.innerHTML = Math.round(1000 / timeSpan) + ' fps';
            }

            timer = setTimeout(tick, Math.max(interval - (currentTime - Date.now()), 0));

            lastTime = currentTime;
        };

        var fadeDuration = 500;
        var preloadAll = false;
        var showLoadProgress = true;
        var audioEnabled = false;
        var showFps = false;
        var globalBaseUrl = '';
        var globalSpeed = 3; // why is it too slow otherwise?
        var speakProbability = 0.1;
        var dontSpeak = false;
        var interval = 40;
        var interactionInterval = 500;
        var ponies = {};
        var instances = [];
        var removing = [];
        var overlay = null;
        var timer = null;
        var mousePosition = null;
        var dragged = null;
        var fpsDisplay = null;
        var volume = 1.0;

        var getOverlay = function() {
            if (!overlay) {
                overlay = tag('div', { id: 'browser-ponies' });
            }
            if (!overlay.parentNode) {
                document.body.appendChild(overlay);
            }
            return overlay;
        };

        observe(document, 'touchstart', function(event) {
            mousePosition = null;
        });
        observe(document, 'mousemove', function(event) {
            if (!mousePosition) {
                mousePosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            }
            if (dragged) {
                dragged.moveBy({
                    x: event.clientX - mousePosition.x,
                    y: event.clientY - mousePosition.y
                });
                extend(dragged.dest_position, dragged.current_position);
                event.preventDefault();
            }
            mousePosition.x = event.clientX;
            mousePosition.y = event.clientY;
        });

        observe(document, 'mouseup', function() {
            if (dragged) {
                var inst = dragged;
                dragged = null;
                if (timer !== null) {
                    inst.nextBehavior();
                }
            }
        });

        return {
            convertPony: function(ini, baseurl) {
                var rows = PonyINI.parse(ini);
                var pony = {
                    baseurl: baseurl || "",
                    behaviorgroups: {},
                    behaviors: [],
                    speeches: [],
                    categories: []
                };
                var behaviors_by_name = {};
                var effects = [];

                for (var i = 0, n = rows.length; i < n; ++i) {
                    var row = rows[i];
                    var type = row[0].toLowerCase();

                    switch (type) {
                        case "name":
                            pony.name = row[1];
                            break;

                        case "behaviorgroup":
                            var group = parseInt(row[1], 10);
                            if (isNaN(group)) {
                                if (tinydebugBrowserPonies == true) {
                                    console.warn(baseurl + ': illegal behavior group id: ', row[1]);
                                }
                            } else {
                                pony.behaviorgroups[group] = row[2];
                            }
                            break;

                        case "behavior":
                            var behavior = {
                                name: row[1],
                                probability: Number(row[2]),
                                maxduration: Number(row[3]),
                                minduration: Number(row[4]),
                                speed: Number(row[5]),
                                rightimage: encodeURIComponent(row[6]),
                                leftimage: encodeURIComponent(row[7]),
                                movement: row[8],
                                effects: [],
                                auto_select_images: true,
                                dont_repeat_animation: false // XXX: cannot be supported by JavaScript
                            };
                            if (row.length > 9) {
                                if (row[9]) behavior.linked = row[9];
                                var speakstart = (row[10] || '').trim();
                                if (speakstart) behavior.speakstart = speakstart;
                                var speakend = (row[11] || '').trim();
                                if (speakend) behavior.speakend = speakend;
                                behavior.skip = parseBoolean(row[12]);
                                behavior.x = Number(row[13]);
                                behavior.y = Number(row[14]);
                                if (row[15]) behavior.follow = row[15];

                                if (row.length > 16) {
                                    behavior.auto_select_images = parseBoolean(row[16]);
                                    if (row[17]) behavior.stopped = row[17];
                                    if (row[18]) behavior.moving = row[18];

                                    if (row.length > 19) {
                                        behavior.rightcenter = parsePoint(row[19]);
                                        behavior.leftcenter = parsePoint(row[20]);

                                        if (row.length > 21) {
                                            behavior.dont_repeat_animation = parseBoolean(row[21]);
                                            if (behavior.dont_repeat_animation) {
                                                if (tinydebugBrowserPonies == true) {
                                                    console.warn(baseurl + ': behavior ' + behavior.name +
                                                        ' sets dont_repeat_animation to true, which is not supported by Browser Ponies due to limitations in browsers. ' +
                                                        'Please use a GIF that does not loop instead.');
                                                }
                                            }
                                            if (row[22]) {
                                                behavior.group = parseInt(row[22], 10);
                                                if (isNaN(behavior.group)) {
                                                    delete behavior.group;
                                                    if (tinydebugBrowserPonies == true) {
                                                        console.warn(baseurl + ': behavior ' + behavior.name +
                                                            ' references illegal behavior group id: ', row[22]);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            pony.behaviors.push(behavior);
                            behaviors_by_name[behavior.name.toLowerCase()] = behavior;
                            break;

                        case "effect":
                            var effect = {
                                name: row[1],
                                behavior: row[2],
                                rightimage: encodeURIComponent(row[3]),
                                leftimage: encodeURIComponent(row[4]),
                                duration: Number(row[5]),
                                delay: Number(row[6]),
                                rightloc: row[7].trim(),
                                rightcenter: row[8].trim(),
                                leftloc: row[9].trim(),
                                leftcenter: row[10].trim(),
                                follow: parseBoolean(row[11]),
                                dont_repeat_animation: row[12] ? parseBoolean(row[12]) : false // XXX: cannot be supported by JavaScript
                            };
                            if (effect.dont_repeat_animation) {
                                if (tinydebugBrowserPonies == true) {
                                    console.warn(baseurl + ': effect ' + effect.name +
                                        ' sets dont_repeat_animation to true, which is not supported by Browser Ponies due to limitations in browsers. ' +
                                        'Please use a GIF that does not loop instead.');
                                }
                            }
                            effects.push(effect);
                            break;

                        case "speak":
                            var speak;
                            if (row.length === 2) {
                                speak = {
                                    text: row[1]
                                };
                            } else {
                                speak = {
                                    name: row[1],
                                    text: row[2].trim()
                                };
                                if (row[4]) speak.skip = parseBoolean(row[4]);
                                if (row[5]) speak.group = parseInt(row[5], 10);
                                var files = row[3];
                                if (files) {
                                    if (!Array.isArray(files)) files = [files];
                                    if (files.length > 0) {
                                        speak.files = {};
                                        for (var j = 0; j < files.length; ++j) {
                                            var file = files[j];
                                            var ext = /(?:\.([^\.]*))?$/.exec(file)[1];
                                            var filetype;
                                            if (ext) {
                                                ext = ext.toLowerCase();
                                                filetype = AudioMimeTypes[ext] || 'audio/x-' + ext;
                                            } else {
                                                filetype = 'audio/x-unknown';
                                            }
                                            if (filetype in speak.files) {
                                                if (tinydebugBrowserPonies == true) {
                                                    console.warn(baseurl + ': file type ' + filetype +
                                                        ' of speak line ' + speak.name +
                                                        ' is not unique.');
                                                }
                                            }
                                            speak.files[filetype] = encodeURIComponent(file);
                                        }
                                    }
                                }
                                if ('group' in speak && isNaN(speak.group)) {
                                    delete speak.group;
                                    if (tinydebugBrowserPonies == true) {
                                        console.warn(baseurl + ': speak line ' + speak.name +
                                            ' references illegal behavior group id: ', row[5]);
                                    }
                                }
                            }
                            pony.speeches.push(speak);
                            break;

                        case "categories":
                            pony.categories = pony.categories.concat(row.slice(1));
                            break;

                        default:
                            if (tinydebugBrowserPonies == true) {
                                console.warn(baseurl + ": Unknown pony setting:", row);
                            }
                    }
                }

                if (!('name' in pony)) {
                    throw new Error('Pony with following base URL has no name: ' + pony.baseurl);
                }

                for (var i = 0, n = effects.length; i < n; ++i) {
                    var effect = effects[i];
                    var behavior = effect.behavior.toLowerCase();
                    if (!has(behaviors_by_name, behavior)) {
                        if (tinydebugBrowserPonies == true) {
                            console.warn(baseurl + ": Effect " + effect.name + " of pony " + pony.name +
                                " references non-existing behavior " + effect.behavior);
                        }
                    } else {
                        behaviors_by_name[behavior].effects.push(effect);
                        delete effect.behavior;
                    }
                }

                for (var name in behaviors_by_name) {
                    var behavior = behaviors_by_name[name];
                    if (behavior.effects.length === 0) {
                        delete behavior.effects;
                    }
                }

                var has_behaviorgroups = false;
                for (var behaviorgroup in pony.behaviorgroups) {
                    has_behaviorgroups = true;
                    break;
                }

                if (!has_behaviorgroups) {
                    delete pony.behaviorgroups;
                }

                return pony;
            },
            convertInteractions: function(ini) {
                var rows = PonyINI.parse(ini);
                var interactions = [];

                for (var i = 0, n = rows.length; i < n; ++i) {
                    var row = rows[i];
                    var activate = "one";
                    if (row.length > 4) {
                        activate = row[5].trim().toLowerCase();
                        if (activate === "true" || activate === "all") {
                            activate = "all";
                        } else if (activate == "random" || activate === "any") {
                            activate = "any";
                        } else if (activate === "false" || activate === "one") {
                            activate = "one";
                        } else {
                            throw new Error("illegal target activation value: " + row[5]);
                        }
                    }

                    var proximity = row[3].trim().toLowerCase();
                    if (proximity !== "default") proximity = Number(proximity);
                    interactions.push({
                        name: row[0],
                        pony: row[1],
                        probability: Number(row[2]),
                        proximity: proximity,
                        targets: row[4],
                        activate: activate,
                        behaviors: row[6],
                        delay: row.length > 7 ? Number(row[7].trim()) : 0
                    });
                }

                return interactions;
            },
            addInteractions: function(interactions) {
                if (typeof(interactions) === "string") {
                    interactions = this.convertInteractions(interactions);
                }
                for (var i = 0, n = interactions.length; i < n; ++i) {
                    this.addInteraction(interactions[i]);
                }
            },
            addInteraction: function(interaction) {
                var lowername = interaction.pony.toLowerCase();
                if (!has(ponies, lowername)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("No such pony:", interaction.pony);
                    }
                    return false;
                }
                return ponies[lowername].addInteraction(interaction);
            },
            addPonies: function(ponies) {
                for (var i = 0, n = ponies.length; i < n; ++i) {
                    this.addPony(ponies[i]);
                }
            },
            addPony: function(pony) {
                if (pony.ini) {
                    pony = this.convertPony(pony.ini, pony.baseurl);
                }
                if (pony.behaviors.length === 0) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("Pony " + pony.name + " has no behaviors.");
                    }
                    return false;
                }
                var lowername = pony.name.toLowerCase();
                if (has(ponies, lowername)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("Pony " + pony.name + " already exists.");
                    }
                    return false;
                }
                ponies[lowername] = new Pony(pony);
                return true;
            },
            removePonies: function(ponies) {
                for (var i = 0, n = ponies.length; i < n; ++i) {
                    this.removePony(ponies[i]);
                }
            },
            removePony: function(name) {
                var lowername = name.toLowerCase();
                if (has(ponies, lowername)) {
                    ponies[lowername].unspawnAll();
                    delete ponies[lowername];
                }
            },
            spawnRandom: function(count) {
                if (count === undefined) count = 1;
                else count = parseInt(count);

                if (isNaN(count)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("unexpected NaN value");
                    }
                    return [];
                }

                var spawned = [];
                while (count > 0) {
                    var mininstcount = Infinity;

                    for (var name in ponies) {
                        var instcount = ponies[name].instances.length;
                        if (instcount < mininstcount) {
                            mininstcount = instcount;
                        }
                    }

                    if (mininstcount === Infinity) {
                        console.error("can't spawn random ponies because there are no ponies loaded");
                        break;
                    }

                    var names = [];
                    for (var name in ponies) {
                        if (ponies[name].instances.length === mininstcount) {
                            names.push(name);
                        }
                    }

                    var name = randomSelect(names);

                    if (this.spawn(name)) {
                        spawned.push(name);
                    }
                    --count;
                }
                return spawned;
            },
            spawn: function(name, count) {
                var lowername = name.toLowerCase();
                if (!has(ponies, lowername)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("No such pony:", name);
                    }
                    return false;
                }
                var pony = ponies[lowername];
                if (count === undefined) {
                    count = 1;
                } else {
                    count = parseInt(count);
                    if (isNaN(count)) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("unexpected NaN value");
                        }
                        return false;
                    }
                }

                if (count > 0 && timer !== null) {
                    pony.preload();
                }
                var n = count;
                while (n > 0) {
                    var inst = new PonyInstance(pony);
                    pony.instances.push(inst);
                    if (timer !== null) {
                        onload(function() {
                            if (this.pony.instances.indexOf(this) === -1) return;
                            instances.push(this);
                            this.img.style.visibility = 'hidden';
                            getOverlay().appendChild(this.img);
                            this.teleport();
                            this.nextBehavior();
                            // fix position because size was initially 0x0
                            this.clipToScreen();
                            this.img.style.visibility = '';
                        }.bind(inst));
                    } else {
                        instances.push(inst);
                    }
                    --n;
                }
                return true;
            },
            unspawn: function(name, count) {
                var lowername = name.toLowerCase();
                if (!has(ponies, lowername)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("No such pony:", name);
                    }
                    return false;
                }
                var pony = ponies[lowername];
                if (count === undefined) {
                    count = pony.instances.length;
                } else {
                    count = parseInt(count);
                    if (isNaN(count)) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("unexpected NaN value");
                        }
                        return false;
                    }
                }
                if (count >= pony.instances.length) {
                    pony.unspawnAll();
                } else {
                    while (count > 0) {
                        pony.instances[pony.instances.length - 1].unspawn();
                        --count;
                    }
                }
                return true;
            },
            unspawnAll: function() {
                for (var name in ponies) {
                    ponies[name].unspawnAll();
                }
            },
            clear: function() {
                this.unspawnAll();
                ponies = {};
            },
            preloadAll: function() {
                for (var name in ponies) {
                    ponies[name].preload();
                }
            },
            preloadSpawned: function() {
                for (var name in ponies) {
                    var pony = ponies[name];
                    if (pony.instances.length > 0) {
                        pony.preload();
                    }
                }
            },
            start: function() {
                if (preloadAll) {
                    this.preloadAll();
                } else {
                    this.preloadSpawned();
                }
                onload(function() {
                    var overlay = getOverlay();
                    overlay.innerHTML = '';
                    for (var i = 0, n = instances.length; i < n; ++i) {
                        var inst = instances[i];
                        inst.clear();
                        inst.img.style.visibility = 'hidden';
                        overlay.appendChild(inst.img);
                        inst.teleport();
                        inst.nextBehavior();
                        // fix position because size was initially 0x0
                        inst.clipToScreen();
                        inst.img.style.visibility = '';
                    }
                    if (timer === null) {
                        lastTime = Date.now();
                        timer = setTimeout(tick, 0);
                    }
                });
            },
            timer: function() {
                return timer;
            },
            stop: function() {
                if (overlay) {
                    overlay.parentNode.removeChild(overlay);
                    overlay.innerHTML = '';
                    overlay = null;
                }
                fpsDisplay = null;
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
            },
            pause: function() {
                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }
            },
            resume: function() {
                if (preloadAll) {
                    this.preloadAll();
                } else {
                    this.preloadSpawned();
                }
                onload(function() {
                    if (timer === null) {
                        lastTime = Date.now();
                        timer = setTimeout(tick, 0);
                    }
                });
            },
            setInterval: function(ms) {
                ms = parseInt(ms);
                if (isNaN(ms)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("unexpected NaN value for interval");
                    }
                } else if (interval !== ms) {
                    interval = ms;
                }
            },
            getInterval: function() {
                return interval;
            },
            setFps: function(fps) {
                this.setInterval(1000 / Number(fps));
            },
            getFps: function() {
                return 1000 / interval;
            },
            setInteractionInterval: function(ms) {
                ms = Number(ms);
                if (isNaN(ms)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("unexpected NaN value for interaction interval");
                    }
                } else {
                    interactionInterval = ms;
                }
            },
            getInteractionInterval: function() {
                return interactionInterval;
            },
            setSpeakProbability: function(probability) {
                probability = Number(probability);
                if (isNaN(probability)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("unexpected NaN value for speak probability");
                    }
                } else {
                    speakProbability = probability;
                }
            },
            getSpeakProbability: function() {
                return speakProbability;
            },
            setDontSpeak: function(value) {
                dontSpeak = !!value;
            },
            isDontSpeak: function() {
                return dontSpeak;
            },
            setVolume: function(value) {
                value = Number(value);
                if (isNaN(value)) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("unexpected NaN value for volume");
                    }
                } else if (value < 0 || value > 1) {
                    if (tinydebugBrowserPonies == true) {
                        console.error("volume out of range", value);
                    }
                } else {
                    volume = value;
                }

            },
            getVolume: function() {
                return volume;
            },
            getBaseUrl: function() {
                return globalBaseUrl;
            },
            setSpeed: function(speed) {
                globalSpeed = Number(speed);
            },
            getSpeed: function() {
                return globalSpeed;
            },
            setAudioEnabled: function(enabled) {
                if (typeof(enabled) === "string") {
                    try {
                        enabled = parseBoolean(enabled);
                    } catch (e) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("illegal value for audio enabled", enabled, e);
                        }
                        return;
                    }
                } else {
                    enabled = !!enabled;
                }
                if (audioEnabled !== enabled && enabled) {
                    audioEnabled = enabled;
                    if (preloadAll) {
                        this.preloadAll();
                    } else {
                        this.preloadSpawned();
                    }
                } else {
                    audioEnabled = enabled;
                }
            },
            isAudioEnabled: function() {
                return audioEnabled;
            },
            setShowFps: function(value) {
                if (typeof(value) === "string") {
                    try {
                        showFps = parseBoolean(value);
                    } catch (e) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("illegal value for show fps", value, e);
                        }
                        return;
                    }
                } else {
                    showFps = !!value;
                }
                if (!showFps && fpsDisplay) {
                    if (fpsDisplay.parentNode) {
                        fpsDisplay.parentNode.removeChild(fpsDisplay);
                    }
                    fpsDisplay = null;
                }
            },
            isShowFps: function() {
                return showFps;
            },
            setPreloadAll: function(all) {
                if (typeof(all) === "string") {
                    try {
                        preloadAll = parseBoolean(all);
                    } catch (e) {
                        if (tinydebugBrowserPonies == true) {
                            console.error("illegal value for preload all", all, e);
                        }
                        return;
                    }
                } else {
                    preloadAll = !!all;
                }
            },
            isPreloadAll: function() {
                return preloadAll;
            },
            setShowLoadProgress: function(show) {
                if (typeof(show) === "string") {
                    try {
                        showLoadProgress = parseBoolean(show);
                    } catch (e) {
                        if (tinydebugBrowserPonies == true) {
                            console.error(e);
                        }
                        return;
                    }
                } else {
                    showLoadProgress = !!show;
                }
            },
            isShowLoadProgress: function() {
                return showLoadProgress;
            },
            getFadeDuration: function() {
                return fadeDuration;
            },
            setFadeDuration: function(ms) {
                fadeDuration = Number(ms);
            },
            running: function() {
                return timer !== null;
            },
            ponies: function() {
                return ponies;
            },
            loadConfig: function(config) {
                if ('speed' in config) {
                    this.setSpeed(config.speed);
                }
                if ('speakProbability' in config) {
                    this.setSpeakProbability(config.speakProbability);
                }
                if ('dontSpeak' in config) {
                    this.setDontSpeak(config.dontSpeak);
                }
                if ('volume' in config) {
                    this.setVolume(config.volume);
                }
                if ('interval' in config) {
                    this.setInterval(config.interval);
                }
                if ('fps' in config) {
                    this.setFps(config.fps);
                }
                if ('interactionInterval' in config) {
                    this.setInteractionInterval(config.interactionInterval);
                }
                if ('audioEnabled' in config) {
                    this.setAudioEnabled(config.audioEnabled);
                }
                if ('showFps' in config) {
                    this.setShowFps(config.showFps);
                }
                if ('preloadAll' in config) {
                    this.setPreloadAll(config.preloadAll);
                }
                if ('showLoadProgress' in config) {
                    this.setShowLoadProgress(config.showLoadProgress);
                }
                if ('fadeDuration' in config) {
                    this.setFadeDuration(config.fadeDuration);
                }
                if (config.ponies) {
                    this.addPonies(config.ponies);
                }
                if (config.interactions) {
                    this.addInteractions(config.interactions);
                }
                if (config.spawn) {
                    for (var name in config.spawn) {
                        this.spawn(name, config.spawn[name]);
                    }
                }
                if ('spawnRandom' in config) {
                    this.spawnRandom(config.spawnRandom);
                }
                if (config.onload) {
                    if (Array.isArray(config.onload)) {
                        for (var i = 0, n = config.onload.length; i < n; ++i) {
                            onload(config.onload[i]);
                        }
                    } else {
                        onload(config.onload);
                    }
                }
                if (config.autostart && timer === null) {
                    this.start();
                }
            },
            // currently excluding ponies and interactions
            dumpConfig: function() {
                var config = {};
                config.baseurl = this.getBaseUrl();
                config.speed = this.getSpeed();
                config.speakProbability = this.getSpeakProbability();
                config.dontSpeak = this.isDontSpeak();
                config.volume = this.getVolume();
                config.interval = this.getInterval();
                config.fps = this.getFps();
                config.interactionInterval = this.getInteractionInterval();
                config.audioEnabled = this.isAudioEnabled();
                config.showFps = this.isShowFps();
                config.preloadAll = this.isPreloadAll();
                config.showLoadProgress = this.isShowLoadProgress();
                config.fadeDuration = this.getFadeDuration();
                // TODO: optionally dump ponies and interactions
                config.spawn = {};
                for (var name in ponies) {
                    var pony = ponies[name];
                    if (pony.instances.length > 0) {
                        config.spawn[pony.name] = pony.instances.length;
                    }
                }

                return config;
            },

            togglePoniesToBackground: function() {
                if (typeof(toggleBrowserPoniesToBackground) === "undefined") {
                    alert("This website does not support bringing Browser Ponies to the background.");
                } else {
                    try {
                        toggleBrowserPoniesToBackground();
                    } catch (e) {
                        alert("Error toggling Browser Ponies to the background:\n\n" + e.name + ': ' + e.message);
                    }
                }
            },

            // expose a few utils:
            Util: {
                setOpacity: setOpacity,
                extend: extend,
                tag: extend(tag, { add: add }),
                has: has,
                format: format,
                partial: partial,
                observe: observe,
                stopObserving: stopObserving,
                IE: IE,
                Opera: Opera,
                Gecko: Gecko,
                HasAudio: HasAudio,
                BaseZIndex: BaseZIndex,
                onload: onload,
                onprogress: onprogress,
                $: $,
                randomSelect: randomSelect,
                dataUrl: dataUrl,
                escapeXml: escapeXml,
                Base64: Base64,
                PonyINI: PonyINI,
                getOverlay: getOverlay,
                parseBoolean: parseBoolean,
                parsePoint: parsePoint
            }
        };
    })();
}
