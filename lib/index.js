/*

#TODO Abstract the Route object...functions are conflicting with array

*/

var RouteState = function () {};

RouteState.route = null;
RouteState.prevRoute = null;
RouteState.injectBodyClass = true;
RouteState.sustainHashHistory = true;
RouteState.previousStateToBody = true;
RouteState.ROUTE_CHANGE_EVENT = 'ROUTE_CHANGE_EVENT';
RouteState.LAST_SESSION_TAG = 'LAST_SESSION_TAG';
RouteState.config = {};
RouteState.config = function (config) {
  this.config = config;
};
RouteState.doneFunk = null;
RouteState.errorFunk = null;
RouteState.DOMs = [];
RouteState.diffListeners = {};
RouteState.diffClusters = {};
RouteState.propValueListeners = {};
RouteState.propValueClusters = {};

RouteState.listenToHash = function (funk, isRoot) {
  // Establish this as a singleton (across frames)
  this.targetWindow = window;
  this.targetDocument = document;

  this.routeStack = []; // Routes can nest in a stack of routes

  // var isTopmostWindow = true;

  if (isRoot !== true) {
    // Need to walk up atainable parents...(at some point)
    if (
      window.top !== window.self
    ) {
      var parentWindow = window.parent;
      var currentWindow = window;
      var prevWindow;
      var passes;

      while (parentWindow !== window.top) {
        try {
          // Will error out when it is in different domain...
          passes = parentWindow.document.domain;
          prevWindow = currentWindow;
          currentWindow = parentWindow;
          parentWindow = currentWindow.parent;
        } catch (e) {
          currentWindow = prevWindow;
          break;
        }
      }

      // Loop doesn't catch this last condition...
      if (parentWindow === window.top) {
        try {
          // Will error out when it is in different domain...
          passes = parentWindow.document.domain;
          currentWindow = parentWindow;
        } catch (e) {
          currentWindow = currentWindow;
        }
      }

      this.targetWindow = currentWindow;
      this.targetDocument = currentWindow.document;

      // If there is some race condition...
      if (!this.targetWindow.RouteState) {
        this.targetWindow.RouteState = this;
        RouteState.DOMs.push(this.targetDocument);
      }
      window.RouteState = this.targetWindow.RouteState;
    }
  }


  RouteState.targetWindow = this.targetWindow;
  RouteState.targetDocument = this.targetDocument;

  RouteState.DOMs.push(document);
  var me = RouteState;

  // Grandparent in previous funks declared...
  if (RouteState.doneFunk) {
    var oldFunk = RouteState.doneFunk;
    RouteState.doneFunk = function (route, prevRoute) {
      oldFunk(route, prevRoute);
      funk(route, prevRoute);
    };
  } else {
    RouteState.doneFunk = funk;
  }

  if (!this.targetWindow.RouteState.hashchangedInitialized) {
    this.targetWindow.addEventListener('hashchange', function () {
      var clone = RouteState.routeFromPath(
        RouteState.targetDocument.location.hash
      );
      if (clone.toHashString() !== RouteState.route.toHashString()) {
        RouteState.updateRoute(clone);
      }
    });

    this.targetWindow.RouteState.hashchangedInitialized = true;

    if (RouteState.sustainHashHistory && localStorage) {
      RouteState.sessionPrevRoute = {};
      var tag = RouteState.LAST_SESSION_TAG;
      RouteState.sessionPrevRoute.route = localStorage.getItem(
        'RouteState.' + tag + '.route'
      );
      RouteState.sessionPrevRoute.pathname = localStorage.getItem(
        'RouteState.' + tag + '.pathname'
      );
      RouteState.sessionPrevRoute.search = localStorage.getItem(
        'RouteState.' + tag + '.search'
      );
    }
  }

  // Kick this off...
  RouteState.updateRoute(
    RouteState.routeFromPath(RouteState.targetDocument.location.hash)
  );
};

RouteState.unlistenHash = function () {
  window.removeEventListener('hashchange');
};

RouteState.kill = function () {
  this.unlistenHash();
  RouteState.diffListeners = {};
  RouteState.propValueListeners = {};
  delete RouteState.prevRoute;
  delete RouteState.route;
};

RouteState.updateRoute = function (newRoute) {
  // Clear out empty values and dependencies...
  newRoute.cleanRoute();

  if (this.route) {
    this.prevRoute = this.route;
  } else {
    this.prevRoute = this.factory();
  }

  this.route = newRoute;

  var me = this;
  this.DOMs.forEach(function(index) {
    me.route.toElementClass(index.querySelectorAll('body'), 's_');
    if (RouteState.previousStateToBody && me.prevRoute) {
      me.prevRoute.toElementClass(index.querySelectorAll('body'), 'sp_');
    }
  }, this);

  this.checkDiffListeners();
  this.checkPropValueListeners();

  if (this.doneFunk) {
    this.doneFunk(this.route, this.prevRoute);
  }
};

RouteState.toPath = function (pathname, overrides, replaceArrays) {
  var route = this.route.clone(overrides, replaceArrays);
  var routeStr = route.toHashString();
  // Document.location = pathname + document.location.search + routeStr;
  this.toLocation(pathname, document.location.search, routeStr);
};

RouteState.toPathAndReplace = function (pathname, state) {
  var route = RouteState.factory(state);
  var routeStr = route.toHashString();
  // Document.location = pathname + document.location.search + routeStr;
  this.toLocation(pathname, document.location.search, routeStr);
};

RouteState.tagSessionRoute = function (tagName) {
  this.saveSessionRoute(tagName);
};
RouteState.saveSessionRoute = function (tagName) {
  if (localStorage) {
    if (!tagName) {
      tagName = RouteState.LAST_SESSION_TAG;
    }

    localStorage.setItem(
      'RouteState.' + tagName + '.route',
      RouteState.route.toHashString()
    );
    localStorage.setItem(
      'RouteState.' + tagName + '.pathname',
      document.location.pathname
    );
    localStorage.setItem(
      'RouteState.' + tagName + '.search',
      document.location.search
    );
  }
};
RouteState.toLocation = function (pathname, search, routeStr) {
  if (RouteState.sustainHashHistory) {
    this.saveSessionRoute();
  }
  document.location = pathname + search + routeStr;
};

RouteState.isSessionPathnameSame = function () {
  return (RouteState.sessionPrevRoute.pathname ===
    document.location.pathname);
};

RouteState.toSessionRoute = function (tagName) {
  if (!tagName) {
    tagName = RouteState.LAST_SESSION_TAG;
  }


  var sessionRoute = {};
  sessionRoute.route = localStorage.getItem(
    'RouteState.' + tagName + '.route'
  );
  sessionRoute.pathname = localStorage.getItem(
    'RouteState.' + tagName + '.pathname'
  );
  sessionRoute.search = localStorage.getItem(
    'RouteState.' + tagName + '.search'
  );


  if (sessionRoute.route) {
    this.toLocation(sessionRoute.pathname, sessionRoute.search, sessionRoute.route);
    return true;
  }
  return false;
};

// Diff listener

RouteState.addDiffListener = function (
  prop,
  callback,
  clusterID
) {
  if (!this.diffListeners[prop]) {
    this.diffListeners[prop] = [];
  }
  this.diffListeners[prop].push(callback);

  if (clusterID) {
    if (!this.diffClusters[clusterID]) {
      this.diffClusters[clusterID] = [];
    }
    this.diffClusters[clusterID].push(callback);
  }

  return callback;
};
RouteState.addDiffListeners = function (
  props,
  callback,
  clusterID
) {
  var prop;
  for (var i = 0; i < props.length; i++) {
    prop = props[i];
    this.addDiffListener(prop, callback, clusterID);
  }
  return callback;
};

RouteState.checkDiffListeners = function () {
  if (this.route) {
    var callbacks;
    var callback;
    var triggerCallbacks;

    for (var prop in this.diffListeners) {
      if (!this.diffListeners.hasOwnProperty(prop)) {
        continue;
      }
      callbacks = this.diffListeners[prop];
      triggerCallbacks = false;

      if (this.prevRoute) {
        if (this.route[prop] !== this.prevRoute[prop]) {
          triggerCallbacks = true;
        }
      } else {
        triggerCallbacks = true;
      }

      if (triggerCallbacks) {
        for (var c = 0; c < callbacks.length; c++) {
          callback = callbacks[c];
          callback(this.route, this.prevRoute);
        }
      }
    }
  }
};

RouteState.removeDiffListener = function (difflistenerID) {
  for (var prop in this.diffListeners) {
    if (!this.diffListeners.hasOwnProperty(prop)) {
      continue;
    }
    var callbacks = this.diffListeners[prop];
    for (var c = 0; c < callbacks.length; c++) {
      var callback = callbacks[c];

      if (callback === difflistenerID) {
        callbacks.splice(c, 1);
        break;
      }
    }
  }
};

RouteState.removeDiffListenersViaClusterId = function (clusterID) {
  if (this.diffClusters[clusterID]) {
    var callbacks = this.diffClusters[clusterID];
    for (var c = 0; c < callbacks.length; c++) {
      var callback = callbacks[c];
      this.removeDiffListener(callback);
    }
    this.diffClusters[clusterID] = false;
    delete this.diffClusters[clusterID];
  }
};

RouteState.addPropValueListener = function (
  prop, value,
  callback, exitcallback,
  clusterID
) {
  if (!this.propValueListeners[prop]) {
    this.propValueListeners[prop] = [];
  }
  this.propValueListeners[prop].push({
    value: value,
    callback: callback,
    exitcallback: exitcallback
  });

  if (clusterID) {
    if (!this.propValueClusters[clusterID]) {
      this.propValueClusters[clusterID] = [];
    }
    this.propValueClusters[clusterID].push(callback);
  }

  return callback;
};

RouteState.checkPropValueListeners = function () {
  if (this.route) {
    var callbackObjs;
    var callbackObj;
    for (var prop in this.propValueListeners) {
      if (!this.propValueListeners.hasOwnProperty(prop)) {
        continue;
      }
      callbackObjs = this.propValueListeners[prop];
      if (this.prevRoute) {
        for (var c = 0; c < callbackObjs.length; c++) {
          callbackObj = callbackObjs[c];

          // Check for exit callback first...
          if (
            callbackObj.exitcallback &&
            this.prevRoute[prop] === callbackObj.value &&
            this.route[prop] !== callbackObj.value
          ) {
            callbackObj.exitcallback(
              this.route, this.prevRoute
            );
          }

          if (
            this.route[prop] === callbackObj.value &&
            this.prevRoute[prop] !== callbackObj.value
          ) {
            callbackObj.callback(
              this.route, this.prevRoute
            );
          }
        }
      } else {
        // Call them all there is no prev route....
        for (var c = 0; c < callbackObjs.length; c++) {
          callbackObj = callbackObjs[c];
          callbackObj.callback(
            this.route, this.prevRoute
          );
        }
      }
    }
  }
};

RouteState.removePropValueListener = function (valProplistenerID) {
  for (var prop in this.propValueListeners) {
    if (!this.propValueListeners.hasOwnProperty(prop)) {
      continue;
    }
    var callbackObjs = this.propValueListeners[prop];
    for (var c = 0; c < callbackObjs.length; c++) {
      var callbackObj = callbackObjs[c];

      if (callbackObj.callback === valProplistenerID) {
        callbackObjs.splice(c, 1);
        break;
      }
    }
  }
};

RouteState.removePropValueListenersViaClusterId = function (clusterID) {
  if (this.propValueClusters[clusterID]) {
    var callbacks = this.propValueClusters[clusterID];
    for (var c = 0; c < callbacks.length; c++) {
      var callback = callbacks[c];
      this.removePropValueListener(callback);
    }
    this.propValueClusters[clusterID] = false;
    delete this.propValueClusters[clusterID];
  }
};

RouteState.factory = function (state) {
  var routeStateRoute = new RouteStateRoute();

  for (var i in state) {
    if (!RouteState.isFunction(i)) {
      if (RouteState.isArray(state[i])) {
        routeStateRoute[i] = [].concat(state[i]);
      } else {
        routeStateRoute[i] = state[i];
      }
    }
  }

  return routeStateRoute;
};

RouteState.routeFromPath = function (path) {
  return this.factory(
    this.objectFromPath(path)
  );
};

RouteState.objectFromPath = function (path) {
  var routeStateRoute = {};

  // Get rid of shebang
  path = path.replace(/#!\//g, '');
  path = path.replace(']', '');

  var dependencyArr = path.split('}[');
  path = dependencyArr[0];
  if (dependencyArr.length > 1) {
    dependencyArr = dependencyArr[1].split(',');
  } else {
    path = path.replace('}', '');
    dependencyArr = [];
  }

  var pathArr = path.split('/{');
  if (pathArr.length < 2) {
    return routeStateRoute;
  }

  var names = pathArr[1];
  var vals = pathArr[0];
  var valsArr = vals.split('/');
  var namesArr = names.split(',');
  // var state = {};
  // var pair;
  var name;
  // var nameArr;
  var val;
  var dependency;
  var depnameArr;

  for (var a = 0; a < namesArr.length; a++) {
    name = namesArr[a];

    // Deal with dependencies...they are index based versus name
    dependency = dependencyArr[a];
    if (dependency) {
      if (!RouteState.config[name]) {
        RouteState.config[name] = {};
      }
      depnameArr = dependency.split(':');
      if (depnameArr.length > 1) {
        dependency = namesArr[depnameArr[0]] + ':' + depnameArr[1];
      } else {
        dependency = namesArr[dependency];
      }
      RouteState.config[name].dependency = dependency;
    }

    // Now put values together
    val = valsArr[a];
    if (val && val.length > 0 && name && name.length > 0) {
      if (val.indexOf(',') !== -1) { // Array
        routeStateRoute[name] = val.split(',');
      } else {
        routeStateRoute[name] = val;
      }
    }
  }

  return routeStateRoute;
};

// ===========HELPERS============
RouteState.isFunction = function (functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) ===
    '[object Function]';
};

RouteState.isArray = function (functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) ===
    '[object Array]';
};

RouteState.stateToObject = function (state) {
  var stateArr;
  var stateObj = {
    name: false,
    dependency: false,
    relation: 0 // 0 = none, 1 = exists, 2 = exists and value
  };
  if (state.indexOf(':') !== -1) {
    stateArr = state.split(':');
    stateObj.name = stateArr[1];
    stateObj.dependency = stateArr[0];
    stateObj.relation = 2;
  } else if (state.indexOf('.') !== -1) {
    stateArr = state.split('.');
    stateObj.name = stateArr[1];
    stateObj.dependency = stateArr[0];
    stateObj.relation = 1;
  } else {
    stateObj.name = state;
    stateObj.dependency = false;
    stateObj.relation = 0;
  }

  return stateObj;
};

// ===========ROUTE OPERATORS============
RouteState.merge = function (overrides, replaceArrays) {
  if (this.route) {
    overrides = RouteState.processObjectForDependencies(overrides);
    var newRoute = this.route.clone(overrides, replaceArrays);
    RouteState.updateRoute(newRoute);
    newRoute.toHash();
  }
};

RouteState.replace = function (state) {
  state = RouteState.processObjectForDependencies(state);
  var newRoute = RouteState.factory(state);
  RouteState.updateRoute(newRoute);
  newRoute.toHash();
};

RouteState.processObjectForDependencies = function (overrides) {
  var stateObj = {};
  var newOverrides = {};
  for (var name in overrides) {
    if (!overrides.hasOwnProperty(name)) {
      continue;
    }
    stateObj = RouteState.stateToObject(name);
    newOverrides[stateObj.name] = overrides[name];
    switch (stateObj.relation) {
      case 1:
        RouteState.tieToProp(
          stateObj.name,
          stateObj.dependency
        );
        break;
      case 2:
        RouteState.tieToPropAndValue(
          stateObj.name,
          stateObj.dependency,
          overrides
        );
        break;
      default:
        RouteState.removeTies(name);
        break;
    }
  }
  return newOverrides;
};

RouteState.removeTies = function (source) {
  if (!RouteState.config[source]) {
    RouteState.config[source] = {};
  }
  delete RouteState.config[source].dependency;
};

RouteState.tieToProp = function (source, target) {
  if (!RouteState.config[source]) {
    RouteState.config[source] = {};
  }
  RouteState.config[source].dependency = target;
};

RouteState.tieToPropAndValue = function (source, target, overrides) {
  if (!RouteState.config[source]) {
    RouteState.config[source] = {};
  }

  if (
    (RouteState.route && RouteState.route[target]) ||
    (overrides && overrides[target])
  ) {
    var targetValue;
    // Overrides should take precedence...
    // they are going to be a part of the new route.
    if (overrides[target]) {
      targetValue = overrides[target];
    } else {
      targetValue = RouteState.route[target];
    }

    RouteState.config[source].dependency =
      target + ':' + targetValue;
  } else {
    RouteState.tieToProp(source, target);
  }
};

// These are all operating on top of merge...
RouteState.toggle = function (state, otherState, replaceArrays) {
  var stateObj;
  for (var name in state) {
    if (!state.hasOwnProperty(name)) {
      continue;
    }
    stateObj = RouteState.stateToObject(name);

    if (this.isArray(state[name])) {
      if (!this.route[stateObj.name]) {
        this.route[stateObj.name] = [];
      }
      if (!RouteState.isArray(this.route[stateObj.name])) {
        this.route[stateObj.name] = [].concat(this.route[stateObj.name]);
      }

      var subName;
      for (var i = 0; i < state[name].length; i++) {
        subName = state[name][i];
        if (this.route[stateObj.name].indexOf(subName) === -1) {
          this.merge(state, replaceArrays);
          return;
        }
      }
    } else if (this.route[stateObj.name] !== state[name]) {
      this.merge(state, replaceArrays);
      return;
    }
  }

  // If it made it this far it is the latter state
  this.merge(otherState, replaceArrays);
};

// ===========END ROUTE OPERATORS============

RouteState.debug = function () {
  // $('.routestate_debug').remove();

  var routestateDebug = document.getElementsByClassName('routestate_debug');
  console.log(routestateDebug);
  if (routestateDebug.parentNode !== undefined) {
    routestateDebug.parentNode.removeChild(routestateDebug);
  }

  var html = ['width' + window.naturalWidth + ' | height' + window.naturalHeight];
  var depends;
  for (var i in this.route) {
    if (!RouteState.isFunction(this.route[i])) {
      depends = '';
      if (RouteState.config[i] && RouteState.config[i].dependency) {
        depends = ' (depends on \'' + RouteState.config[i].dependency + '\')';
      }

      if (RouteState.isArray(this.route[i])) {
        html.push(
          i + ' = ' +
          this.route[i].join(',<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') +
          depends
        );
      } else {
        html.push(i + ' = ' + this.route[i] + depends);
      }
    }
  }

  var debugHTML = function (html) {
    return ('<div onclick="routestateDebug.parentNode.removeChild(routestateDebug);" class="routestate_debug" style="padding: 10px; border: 1px solid grey; width:300px; height: auto; background-color: #fff; position: fixed; top: 10px; right: 10px; z-index: 2000000;">' + html +'<br/></div>');
  }

  document.body.innerHTML = debugHTML;

  // document.body.innerHTML('<div onclick=\'routestateDebug.parentNode.removeChild(routestateDebug);\'' +
  //   ' class=\'routestate_debug\'' +
  //   ' style=\'padding: 10px; border: 1px solid grey;' +
  //   ' width:300px; height: auto; background-color: #fff;' +
  //   ' position: fixed; top: 10px;' +
  //   ' right: 10px; z-index: 2000000;\'>' +
  //   html.join('<br/>') +
  //   '</div>');
};

// ===========ROUTE STACK==================
RouteState.push = function () {
  this.routeStack.push(this.route.clone());
  return this;
};

RouteState.pop = function () {
  if (this.routeStack.length > 0) {
    this.replace(this.routeStack.pop());
  } else {
    console.log('RouteState: nothing left in the stack.');
    if ( RouteState.errorFunk ) {
      RouteState.errorFunk( "popped empty stack" );
    }
  }
  return this;
};

// ============================================
// ========== RouteStateRoute =================
// ============================================

var RouteStateRoute = function () {};

RouteStateRoute.prototype.toHash = function () {
  var routeStr = this.toHashString();
  RouteState.targetDocument.location.hash = routeStr;
};

// ===========SERIALIZERS==================
RouteStateRoute.prototype.toHashString = function () {
  var routeConfig;
  var routeObj = this.toObject();
  var routeArr = [];
  var defaultWeight = 100000;
  for (var name in routeObj) {
    if (!routeObj.hasOwnProperty(name)) {
      continue;
    }
    // See if we are supposed to show this...
    // make sure to get the top most config...
    routeConfig = RouteState.config[name];

    if (routeConfig) {
      // ignore this if it shouldn't be in hash
      if (
        typeof routeConfig.show_in_hash !== 'undefined' &&
        routeConfig.show_in_hash === false
      ) {
        continue;
      }
    } else {
      routeConfig = {
        weight: defaultWeight
      };
    }

    var weight = (routeConfig.weight) ?
      routeConfig.weight : defaultWeight;

    if (RouteState.isArray(routeObj[name])) {
      routeArr.push({
        name: name,
        val: routeObj[name].join(','),
        weight: weight
      });
    } else {
      routeArr.push({
        name: name,
        val: routeObj[name],
        weight: weight
      });
    }
  }

  // Sort according to weight
  routeArr.sort(function (a, b) {
    if (a.weight < b.weight) {
      return -1;
    }
    if (a.weight > b.weight) {
      return 1;
    }

    return 0;
  });

  var nameArr = [];
  var nameLookup = {};
  var valArr = [];
  var dependancyArr = [];

  // Finally put it all together in correct order...
  for (var key in routeArr) {
    // Skip loop if the property is from prototype
    if (!routeArr.hasOwnProperty(key)) {
      continue;
    }

    var obj = routeArr[key];

    nameArr.push(obj.name);
    valArr.push(obj.val);
    nameLookup[obj.name] = key;
  }

  // Now add dependencies, but via index of the name...
  var depnameArr = false;
  var showDependencies = false;
  routeArr.forEach(function(index, value) {
    if (
      RouteState.config &&
      RouteState.config[value.name] &&
      RouteState.config[value.name].dependency
    ) {
      depnameArr = RouteState.config[value.name].dependency.split(':');
      if (depnameArr.length > 1) {
        dependancyArr.push(nameLookup[depnameArr[0]] + ':' + depnameArr[1]);
        showDependencies = true;
      } else {
        dependancyArr.push(nameLookup[depnameArr[0]]);
        showDependencies = true;
      }
    } else {
      dependancyArr.push('');
    }
  }, this);

  if (valArr.length > 0) {
    if (showDependencies) {
      return '#!/' + valArr.join('/') + '/{' + nameArr.join(',') + '}[' + dependancyArr.join(',') + ']';
    }
    return '#!/' + valArr.join('/') + '/{' + nameArr.join(',') + '}';
  }
  return '';
};

RouteStateRoute.prototype.serializedToBodyClasses = function (prefix) {
  var bodyClasses = [];

  // Put pathname in there...
  // pathname always has a preceeding slash
  if (RouteState.targetDocument !== undefined) {
    bodyClasses.push(
      prefix + 'pathname' + RouteState.targetDocument.location.pathname.replace(/\//g, '_')
    );
  }

  var routeObj = this.toObject();
  for (var name in routeObj) {
    if (!routeObj.hasOwnProperty(name)) {
      continue;
    }
    // See if we are supposed to show this...
    var routeConfig = RouteState.config[name];
    if (routeConfig) {
      if (
        typeof routeConfig.show_in_body !== 'undefined' &&
        routeConfig.show_in_body === false
      ) {
        continue;
      }
    }

    if (RouteState.isArray(routeObj[name])) {
      var element;
      for (var e = 0; e < routeObj[name].length; e++) {
        element = routeObj[name][e];
        bodyClasses.push(prefix + name + '_' + element);
      }
    } else {
      bodyClasses.push(prefix + name + '_' + routeObj[name]);
    }

    // Just a name, boolean lookup thing
    bodyClasses.push(prefix + name);
  }

  if (bodyClasses.length === 0) {
    bodyClasses.push(prefix + 'empty');
  }
  return bodyClasses.join(' ');
};

RouteStateRoute.prototype.cleanRoute = function () {
  var dependancyHits = 0;
  var dependencyArr;
  for (var name in this) {
    if (!RouteState.isFunction(this[name])) {
      var routeConfig = RouteState.config[name];
      if (routeConfig && typeof routeConfig.dependency !== 'undefined') {
        // ignore this if it has a missing dependancy
        dependencyArr = routeConfig.dependency.split(':');
        if (dependencyArr.length > 1) {
          if (!this[dependencyArr[0]] ||
            String(this[dependencyArr[0]]) !== String(dependencyArr[1])
          ) {
            dependancyHits++;
            delete this[name];
          }
        } else if (!this[routeConfig.dependency]) {
          dependancyHits++;
          delete this[name];
        }
      }

      // Clean out empty values...
      if (!this[name] || this[name] === '') {
        delete this[name];
      }
    }
  }

  if (dependancyHits > 0) {
    this.cleanRoute();
  }
};

RouteStateRoute.prototype.toObject = function () {
  var routeObj = {};
  for (var name in this) {
    if (!RouteState.isFunction(this[name])) {
      routeObj[name] = this[name];
    }
  }
  return routeObj;
};
// ===============END SERIALIZERS=============

RouteStateRoute.prototype.toElementClass = function (element, prefix) {
  var bodyClass = element[0].classList.value;
  if (bodyClass) {
    var bodyClassList = bodyClass.split(/\s+/);
    bodyClassList.forEach(function(index, item) {
      if (index.indexOf(prefix) === 0) {
        element[0].classList.remove(index);
      }
    }, this);
  }

  var serializedClasses = this.serializedToBodyClasses(prefix);
  var serializedClassList = serializedClasses.split(/\s+/);
  serializedClassList.forEach(function(item, index) {
    element[0].classList.add(item);
  }, this);
};

RouteStateRoute.prototype.clone = function (overrides, replaceArrays) {
  var routeState = RouteState.factory(this);

  if (!replaceArrays) {
    replaceArrays = false;
  }

  if (overrides) {
    for (var i in overrides) {
      if (!RouteState.isFunction(overrides[i])) {
        if (RouteState.isArray(overrides[i])) {
          if (replaceArrays) {
            routeState[i] = [].concat(overrides[i]);
          } else {
            if (!routeState[i]) {
              routeState[i] = [];
            }
            if (!RouteState.isArray(routeState[i])) {
              routeState[i] = [].concat(routeState[i]);
            }

            var override;
            for (var p = 0; p < overrides[i].length; p++) {
              override = String(overrides[i][p]);
              if (override.indexOf('-') === 0) {
                override = override.replace('-', '');
                var index = routeState[i].indexOf(override);
                if (index > -1) {
                  routeState[i].splice(index, 1);
                }
              } else if (routeState[i].indexOf(override) === -1) {
                routeState[i].push(override);
              }
            }
          }
        } else {
          routeState[i] = overrides[i];
        }
      }
    }
  }
  return routeState;
};

