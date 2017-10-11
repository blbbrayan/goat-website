(function (global) {

    /*
     CORE
     */

    var core = Array.from(document.getElementsByTagName("script")).find(function (script) {
        return script.src.includes('goat.js');
    });

    var goat = {
        extend: function (obj) {
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    this[i] = obj[i];
                }
            }
        },
        showLog: true,
        loaded: 0,
        tagDir: core['attributes']['tag-dir'].value,
        init: core['attributes']['init'].value,
        moduleDir: core['attributes']['module-dir'].value,
        isLoaded: function (url) {
            return Array.from(document.getElementsByTagName("script")).find(function (script) {
                    return script.src === url
                }) !== undefined;
        },
        loadScript: function (url, callback) {
            if (this.isLoaded(url))
                callback();
            else {
                // Adding the script tag to the head as suggested before
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = url;

                // Then bind the event to the callback function.
                // There are several events for cross browser compatibility.
                script.onreadystatechange = function () {
                    if (callback)
                        callback();
                    goat.loaded++;
                };
                script.onload = function () {
                    if (callback)
                        callback();
                    goat.loaded++;
                };

                // Fire the loading
                head.appendChild(script);
            }
        },
        log: function (title, msg) {
            if (this.showLog) {
                console.log(title, msg);
            }
        }
    };

    /*
     HTTP
     */

    var http = {
        get: function (url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onload = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        callback(undefined, xhr.responseText);
                    } else {
                        callback(xhr.statusText);
                    }
                }
            };
            xhr.onerror = function (e) {
                callback(xhr.statusText);
            };
            xhr.send(null);
        }
    };

    goat.extend({http: http});

    /*
     TAG ENVIRONMENT
     */

    goat.TagEnvironment = function ($tag, $guid, $html, $jstemplate, $modules) {
        var $env = {}, $private = {},
            $intervalfn = [],
            $interval = setInterval(function () {
                $intervalfn.forEach(function (fn) {
                    fn()
                })
            }, 100);

        function parseExpression(exp) {
            exp = exp || "";
            if (exp.includes("$:") || exp.includes('$index:'))
                return "";
            return exp.split('$$').join('$env.');
        }

        function getUnderEnvBy(attr) {
            return goat.filterByAttribute((goat.getUnderEnv($tag) || []), attr);
        }

        //pre
        function $link() {
            $intervalfn.push(function () {
                var ar = getUnderEnvBy('link');
                ar.forEach(function (ele) {
                    if (ele.innerText !== eval(parseExpression(ele.getAttribute('link'))))
                        ele.innerText = eval(parseExpression(ele.getAttribute('link')));
                })
            });
        }

        function $bind() {
            $intervalfn.push(function () {
                var ar = getUnderEnvBy('bind');
                ar.forEach(function (ele) {
                    if ($env[ele.getAttribute('bind')] !== ele.value)
                        $env[ele.getAttribute('bind')] = ele.value;
                })
            });
        }

        function $if() {
            var templates = [];

            function toTemplate(ele, fn) {
                var temp = document.createElement('if');
                templates.push({temp: temp, ele: ele, fn: fn});
                ele.parentElement.replaceChild(temp, ele);
            }

            $intervalfn.push(function () {
                var ar = getUnderEnvBy('if');
                ar.find(function (ele) {
                    if (!eval(parseExpression(ele.getAttribute('if')))) {
                        toTemplate(ele, parseExpression(ele.getAttribute('if')));
                        return true;
                    }
                });
                templates.forEach(function (template) {
                    if (eval(template.fn)) {
                        template.temp.parentElement.replaceChild(template.ele, template.temp);
                        templates.splice(templates.indexOf(template), 1);
                        update();
                    }
                });
            })
        }

        function $for() {

            var watchers = [];

            function createClone(ele, forEle, varName, arrName, i, clones) {
                var clone = ele.cloneNode(true);
                clone.removeAttribute('for');
                var allEle = goat.allUnder(clone);
                allEle.push(clone);
                allEle.forEach(function (e) {
                    Array.from(e.attributes).forEach(function (attr) {
                        attr.value = attr.value.split('$:' + varName).join('$$' + arrName + '[' + i + ']');
                        attr.value = attr.value.split('$index:').join(i);
                    });
                });
                forEle.appendChild(clone);
                clones.push(clone);
                if (clone.hasAttribute('goat')) {
                    var modules = clone.getAttribute('goat') || [];
                    if (typeof modules === "string")
                        modules = modules.split(',');
                    goat.createTag(clone.localName, clone, modules);
                }
                update();
            }

            $intervalfn.push(function () {
                getUnderEnvBy('for').forEach(function (ele) {
                    var elemArray = ele.getAttribute('for').split(':'),
                        arrName = elemArray[0],
                        variableName = elemArray[1],
                        forEle = document.createElement('for');
                    ele.parentElement.replaceChild(forEle, ele);

                    watchers.push({ele: ele, forEle: forEle, arrName: arrName, varName: variableName, clones: []});
                });
                watchers.forEach(function (watcher) {
                    var ar = $env[watcher.arrName];
                    if (ar) {
                        while (watcher.clones.length < ar.length)
                            createClone(watcher.ele, watcher.forEle, watcher.varName, watcher.arrName, watcher.clones.length, watcher.clones);
                        while (watcher.clones.length > ar.length) {
                            var target = watcher.clones[watcher.clones.length - 1];
                            watcher.clones.splice(watcher.clones.indexOf(target), 1);
                            target.remove();
                        }
                    }
                });
            });
        }

        function handleClick(ele) {
            return function (event) {
                eval(parseExpression(ele.getAttribute('click')));
            }
        }

        //post
        function $click() {
            var ar = getUnderEnvBy('click');
            if ($private.click)
                $private.click.forEach(function (click) {
                    if (click.ele)
                        click.ele.removeEventListener('click', click.fn);
                });
            $private.click = [];
            ar.forEach(function (ele) {
                var fn = handleClick(ele);
                ele.addEventListener('click', fn);
                $private.click.push({fn: fn, ele: ele});
            });
        }

        function update() {
            $click();
        }

        function start() {
            $for();
            $if();
            $link();
            $bind();
            eval($jstemplate);
            update();
        }

        function stop() {
            clearInterval($interval);
        }

        return {
            start: start,
            update: update,
            stop: stop,
            el: $tag
        };
    };

    /*
     EVENTS
     */

    var subscriptions = {};
    var handler = {
        broadcast: function (name, obj) {
            if (!subscriptions[name])
                subscriptions[name] = [];
            subscriptions[name].forEach(function (on) {
                on(obj);
            });
        },
        subscribe: function (name, on) {
            if (!subscriptions[name])
                subscriptions[name] = [];
            subscriptions[name].push(on);
        }
    };

    goat.extend({events: handler});

    /*
     GUI
     */

    var gui = {
        get: function (selector) {
            if (selector.includes("#"))
                return document.getElementById(selector.replace("#", ""));

            if (selector.includes("."))
                return Array.from(document.getElementsByClassName(selector.substr(1)));

            if (selector.includes("%"))
                return Array.from(document.querySelectorAll("[data-gui-id='" + selector.substr(1) + "']"))[0];

            if (selector.includes("_"))
                return Array.from(document.querySelectorAll("[" + selector.substr(1) + "]"));

            var ar = Array.from(document.getElementsByTagName(selector));
            if (ar.length === 1)
                return ar[0];
            return ar;
        },
        under: function (element) {
            return Array.from(element.children);
        },
        allUnder: function (element) {
            return Array.from(element.querySelectorAll('*'));
        },
        getUnder: function (element, selector, strict) {
            if (element) {
                var elements = strict ? this.under(element) : this.allUnder(element),
                    specialChar = selector.substr(0, 1),
                    item = selector.substr(1);
                if (specialChar === "#")
                    return elements.find(function (ele) {
                        return ele.id === item;
                    });
                if (specialChar === ".")
                    return elements.filter(function (ele) {
                        return ele.className.includes(item);
                    });
                if (specialChar === "%")
                    return elements.find(function (ele) {
                        return ele.dataset["gui-id"] === item;
                    });
                if (specialChar === "_")
                    return Array.from(element.querySelectorAll("[" + selector.substr(1) + "]"));

                return elements.filter(function (ele) {
                    return ele.tagName.toLowerCase() == selector;
                });
            }
        },
        getUnderEnv: function (element, includegoat) {
            includegoat = includegoat || true;
            if (element) {
                var ar = [],
                    children = Array.from(element.children);

                function getChildren() {
                    var childAr = [];
                    children.forEach(function (child) {
                        if (child.hasAttribute('goat')) {
                            children.splice(children.indexOf(child), 1);
                            if (includegoat)
                                ar.push(child);
                        } else
                            childAr = childAr.concat(Array.from(child.children))
                    });
                    ar = ar.concat(children);
                    children = childAr;
                    if (children.length > 0)
                        return getChildren();
                    else
                        return ar;
                }

                return getChildren();
            }
        },
        filterByAttribute: function (ar, attr) {
            return ar.filter(function (ele) {
                return ele.hasAttribute(attr);
            });
        }
    };

    goat.extend(gui);

    /*
     TAG
     */

    var _modules = {};

    function _removeComments(str) {
        return str.replace('(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|(//.*)');
    }

    function _generateGuid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function _loadModule(moduleName, callback) {
        var module = _modules[moduleName];
        if (module === undefined) {
            goat.http.get(goat.moduleDir + '/' + moduleName + '.js', function (er, data) {
                var fn = '(function(){ var module; ' + _removeComments(data) + ' return module;})()';
                _modules[moduleName] = eval(fn);
                callback();
            });
        } else
            callback();
    }

    function createTag(tagName, ele, modules, callback) {
        modules = modules || [];
        var env = {};
        if (!(ele instanceof HTMLElement)) {
            ele = ele || window.event;
            ele = ele.target;
        }

        var path = goat.tagDir + "/" + tagName + "/" + tagName,
            eleGuid = _generateGuid();
        ele.dataset.guiId = eleGuid;

        function loadTemplate(onLoaded) {
            goat.http.get(path + '.html', function (er, data) {
                env.$html = (ele.innerHTML + "").replace(/\r?\n|\r/g);
                ele.innerHTML = data;
                onLoaded();
            });

            env.template = path + '.html';
        }

        function loadCSS() {
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = path + ".css";
            ele.appendChild(link);
            env.css = path + '.css';
        }

        function loadModules(callback) {
            var i = 0;
            modules.forEach(function (module) {
                _loadModule(module, function () {
                    i++
                });
            });
            var interval = setInterval(function () {
                if (i === modules.length) {
                    clearInterval(interval);
                    callback();
                }
            })
        }

        function loadScript() {
            goat.http.get(path + '.js', function (er, data) {
                if (er)
                    return console.error('goat: error loading ' + tagName + '.js\n', data);
                var tag = goat.TagEnvironment(goat.get('%' + eleGuid), eleGuid, env.$html, _removeComments(data), _modules);
                env.tag = tag;
                tag.start();
                if (callback)
                    callback();
            });

            env.script = path + '.js';
        }

        function finishLoad() {
            var item = document.createElement("img");
            item.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            item.onload = function () {
                loadCSS();
                loadModules(loadScript);
                goat.getUnder(ele, "_goat").forEach(function (e) {
                    var modules = e.getAttribute('goat') || [];
                    if (typeof modules === "string")
                        modules = modules.split(',');
                    createTag(e.localName, e, modules);
                });
                item.parentNode.removeChild(item);
            };
            ele.appendChild(item);
        }

        loadTemplate(finishLoad);

        return env;
    }

    function stopTag(env) {
        env.tag.stop();
    }

    function stopModule(moduleName) {
        delete _modules[moduleName];
    }

    goat.extend({
        createTag: createTag,
        stopTag: stopTag,
        stopModule: stopModule
    });

    /*
     ROUTING
     */

    var router = {
        currentTag: undefined,
        routes: {},
        addRoute: function (path, tagName, modules) {
            goat.router.routes[path] = {tagName: tagName, modules: modules}
        },
        el: null,
        load: function () {
            var router = goat.router;
            // Lazy load view element:
            router.el = router.el || goat.get('router');
            // Current route url (getting rid of '#' in hash as well):
            var url = location.hash.slice(1) || '/';
            // Get route by url:
            var route = router.routes[url];
            // Do we have both a view and a route?
            if (router.el && route) {
                var newEl = document.createElement(route.tagName);
                if (router.currentTag) {
                    goat.stopTag(router.currentTag);
                    var el = router.currentTag.tag.el;
                    el.parentElement.replaceChild(newEl, el);
                } else
                    router.el.appendChild(newEl);
                router.currentTag = goat.createTag(route.tagName, newEl, route.modules);
            }
        },
        start: function () {
            window.addEventListener('hashchange', goat.router.load);
            window.addEventListener('load', goat.router.load);
            goat.router.load();
        }
    };

    goat.extend({router: router});

    /*
     START
     */

    function start() {
        (goat.get("_goat") || []).forEach(function (item) {
            goat.createTag(item.localName, item);
        });
        goat.loadScript(goat.init);
    }

    window.addEventListener('load', start);

    global.goat = goat;

})(window);