/*

#TODO Abstract the Route object...functions are conflicting with array

*/

var RouteState = function(){};

RouteState.route;
RouteState.prev_route;
RouteState.inject_body_class = true;
RouteState.sustain_hash_history = true;
RouteState.previous_state_to_body = true;

RouteState.ROUTE_CHANGE_EVENT = "ROUTE_CHANGE_EVENT";
RouteState.LAST_SESSION_TAG = "LAST_SESSION_TAG";

RouteState.config = {};
RouteState.config = function ( config )
{
	this.config = config;
}

RouteState.doneFunk;
RouteState.DOMs = [];
RouteState.listenToHash = function ( funk, is_root )
{
	// establish this as a singleton (across frames)
	this.target_window = window;
	this.target_document = document;

	this.route_stack = [];// routes can nest in a stack of routes

	var is_topmost_window = true;

	if ( is_root !== true ) {
		// need to walk up atainable parents...(at some point)
		if (
			window.top != window.self
		){
			var parent_window = window.parent;
			var current_window = window;
			var prev_window,passes;

			while ( parent_window != window.top ) {
				try {
					// will error out when it is in different domain...
					passes = parent_window.document.domain;
					prev_window = current_window;
					current_window = parent_window;
					parent_window = current_window.parent;
				}catch (e){
					current_window = prev_window;
					break;
				}
			}

			//loop doesn't catch this last condition...
			if ( parent_window == window.top ) {
				try {
					// will error out when it is in different domain...
					passes = parent_window.document.domain;
					current_window = parent_window;
				}catch (e){
					current_window = current_window;
				}
			}

			this.target_window = current_window;
			this.target_document = current_window.document;

			// if there is some race condition...
			if ( !this.target_window.RouteState ) {
				this.target_window.RouteState = this;
				RouteState.DOMs.push( this.target_document );
			}
			window.RouteState = this.target_window.RouteState;
		}
	}

	/*if (
		!is_topmost_window
	) {
		this.target_window = window.top;
		this.target_document = window.top.document;

		// if there is some race condition...
		if ( !this.target_window.RouteState ) {
			this.target_window.RouteState = this;
			RouteState.DOMs.push( this.target_document );
		}
		window.RouteState = this.target_window.RouteState;
	}*/

	RouteState.target_window = this.target_window;
	RouteState.target_document = this.target_document;

	RouteState.DOMs.push( document );
	var me = RouteState;

	//grandparent in previous funks declared...
	if ( RouteState.doneFunk ) {
		var old_funk = RouteState.doneFunk;
		RouteState.doneFunk = function ( route , prev_route ) {
			old_funk( route , prev_route );
			funk( route , prev_route );
		};
	}else{
		RouteState.doneFunk = funk;
	}

	//RouteState.doneFunk = funk;
	if ( !this.target_window.RouteState.hashchanged_initialized ) {
		$( this.target_window ).on('hashchange',function() {
			// the hashchange duplicates update, so check if it is different...
			// that would mean the hash was directly
			// changed (by user or back button)
			var clone = RouteState.routeFromPath (
				RouteState.target_document.location.hash
			);
			if (
				clone.toHashString()
				!= RouteState.route.toHashString()
			) {
				RouteState.updateRoute( clone );
			}
		});
		// needs to be more intentional...could just refresh page
		// $( this.target_window ).on('unload',function() {
			// RouteState.saveSessionRoute();
		// });
		this.target_window.RouteState.hashchanged_initialized = true;

		if ( RouteState.sustain_hash_history && localStorage ) {
			RouteState.session_prev_route = {};
			var tag = RouteState.LAST_SESSION_TAG;
			RouteState.session_prev_route.route = localStorage.getItem(
											"RouteState."+tag+".route"
										);
			RouteState.session_prev_route.pathname = localStorage.getItem(
											"RouteState."+tag+".pathname"
										);
			RouteState.session_prev_route.search = localStorage.getItem(
											"RouteState."+tag+".search"
										);
		}
	}

	// kick this off...
	RouteState.updateRoute(
		RouteState.routeFromPath( RouteState.target_document.location.hash )
	);
};

RouteState.unlistenHash = function ()
{
	$(window).off('hashchange');
};

RouteState.kill = function ()
{
	this.unlistenHash();
	RouteState.diffListeners = {};
	RouteState.propValueListeners = {};
	delete RouteState.prev_route;
	delete RouteState.route;
};

RouteState.updateRoute = function ( new_route )
{

	// clear out empty values and dependencies...
	new_route.cleanRoute();

	if ( this.route ) {
		this.prev_route = this.route;
	}else{
		this.prev_route = this.factory();
	}

	this.route = new_route;

	var me = this;
	$( this.DOMs ).each( function ( index , value ) {
		me.route.toElementClass( $( value ).find("body") , "s_" );
		if ( RouteState.previous_state_to_body && me.prev_route ) {
			me.prev_route.toElementClass( $( value ).find("body") , "sp_" );
		}
	});

	this.checkDiffListeners();
	this.checkPropValueListeners();

	if ( this.doneFunk ) {
		this.doneFunk( this.route , this.prev_route );
	}
};

RouteState.toPath = function ( pathname , overrides , replace_arrays ) {
	var route = this.route.clone( overrides , replace_arrays );
	var routeStr = route.toHashString();
	//document.location = pathname + document.location.search + routeStr;
	this.toLocation( pathname , document.location.search , routeStr );
};

RouteState.toPathAndReplace = function ( pathname , state ) {
	var route = RouteState.factory( state );
	var routeStr = route.toHashString();
	//document.location = pathname + document.location.search + routeStr;
	this.toLocation( pathname , document.location.search , routeStr );
};

RouteState.tagSessionRoute = function ( tag_name ) {
	this.saveSessionRoute( tag_name );
}
	RouteState.saveSessionRoute = function ( tag_name ) {
		if ( localStorage ) {
			if ( !tag_name ) {
				tag_name = RouteState.LAST_SESSION_TAG;
			}

			localStorage.setItem(
				"RouteState." + tag_name + ".route",
				RouteState.route.toHashString()
			);
			localStorage.setItem(
				"RouteState." + tag_name + ".pathname",
				document.location.pathname
			);
			localStorage.setItem(
				"RouteState." + tag_name + ".search",
				document.location.search
			);
		}
	};
	RouteState.toLocation = function ( pathname , search , routeStr ) {
		if ( RouteState.sustain_hash_history )
			this.saveSessionRoute();
		document.location = pathname + search + routeStr;
	};

RouteState.isSessionPathnameSame = function () {
	return ( RouteState.session_prev_route.pathname
				== document.location.pathname );
}

RouteState.toSessionRoute = function ( tag_name ) {

	if ( !tag_name )
		tag_name = RouteState.LAST_SESSION_TAG;


	var sessionRoute = {};
	sessionRoute.route = localStorage.getItem(
									"RouteState."+tag_name+".route"
								);
	sessionRoute.pathname = localStorage.getItem(
									"RouteState."+tag_name+".pathname"
								);
	sessionRoute.search = localStorage.getItem(
									"RouteState."+tag_name+".search"
								);


	if ( sessionRoute.route ) {
		this.toLocation(
			sessionRoute.pathname,
			sessionRoute.search,
			sessionRoute.route
		);
		return true;
	}else{
		return false;
	}
}

// Diff listener
RouteState.diffListeners = {};
RouteState.diffClusters = {};
RouteState.addDiffListener = function (
	prop,
	callback,
	cluster_id
)
{
	if ( !this.diffListeners[ prop ] ) {
		this.diffListeners[ prop ] = [];
	}
	this.diffListeners[ prop ].push( callback );

	if ( cluster_id ) {
		if ( !this.diffClusters[ cluster_id ] ) {
			this.diffClusters[ cluster_id ] = [];
		}
		this.diffClusters[ cluster_id ].push( callback );
	}

	return callback;
}
RouteState.addDiffListeners = function (
	props,
	callback,
	cluster_id
)
{
	var prop;
	for ( var i=0; i<props.length; i++ ) {
		prop = props[i];
		this.addDiffListener( prop , callback , cluster_id );
	}
	return callback;
}

RouteState.checkDiffListeners = function ()
{
	if ( this.route ) {
		var callbacks,callback,trigger_callbacks;

		for ( var prop in this.diffListeners ) {
			callbacks = this.diffListeners[prop];
			trigger_callbacks = false;

			if ( this.prev_route ) {
				if ( this.route[prop] != this.prev_route[prop] ) {
					trigger_callbacks = true;
				}
			}else{
				trigger_callbacks = true;
			}

			if ( trigger_callbacks ) {
				for ( var c=0; c<callbacks.length; c++ ) {
					callback = callbacks[c];
					callback( this.route , this.prev_route );
				}
			}
		}
	}
}

RouteState.removeDiffListener = function ( difflistener_id )
{
	for ( var prop in this.diffListeners ) {
		callbacks = this.diffListeners[prop];
		for ( var c=0; c<callbacks.length; c++ ) {
			callback = callbacks[c];

			if ( callback === difflistener_id ) {
				callbacks.splice( c , 1 );
				break;
			}
		}
	}
}

RouteState.removeDiffListenersViaClusterId = function ( cluster_id )
{
	if ( this.diffClusters[cluster_id] ) {
		var callbacks = this.diffClusters[cluster_id];
		for ( var c=0; c<callbacks.length; c++ ) {
			callback = callbacks[c];
			this.removeDiffListener( callback );
		}
		this.diffClusters[cluster_id] = false;
		delete this.diffClusters[cluster_id];
	}
}

RouteState.propValueListeners = {};
RouteState.propValueClusters = {};
RouteState.addPropValueListener = function (
	prop , value ,
	callback , exitcallback,
	cluster_id
)
{
	if ( !this.propValueListeners[ prop ] ) {
		this.propValueListeners[ prop ] = [];
	}
	this.propValueListeners[ prop ].push(
		{
			value:value,
			callback:callback,
			exitcallback:exitcallback
		}
	);

	if ( cluster_id ) {
		if ( !this.propValueClusters[ cluster_id ] ) {
			this.propValueClusters[ cluster_id ] = [];
		}
		this.propValueClusters[ cluster_id ].push( callback );
	}

	return callback;
}

RouteState.checkPropValueListeners = function ()
{
	if ( this.route ) {

		var callbackObjs,callbackObj;
		for ( var prop in this.propValueListeners ) {
			callbackObjs = this.propValueListeners[prop];
			if ( this.prev_route ) {
				for ( var c=0; c<callbackObjs.length; c++ ) {
					callbackObj = callbackObjs[c];

					// check for exit callback first...
					if (
						callbackObj.exitcallback &&
						this.prev_route[prop] == callbackObj.value &&
						this.route[prop] != callbackObj.value
					) {
						callbackObj.exitcallback(
							this.route , this.prev_route
						);
					}

					if (
						this.route[prop] == callbackObj.value &&
						this.prev_route[prop] != callbackObj.value
					) {
						callbackObj.callback(
							this.route , this.prev_route
						);
					}
				}
			}else{

				// call them all there is no prev route....
				for ( var c=0; c<callbackObjs.length; c++ ) {
					callbackObj = callbackObjs[c];
					callbackObj.callback(
						this.route , this.prev_route
					);
				}
			}
		}
	}
}

RouteState.removePropValueListener = function ( valProplistener_id )
{
	for ( var prop in this.propValueListeners ) {
		callbackObjs = this.propValueListeners[prop];
		for ( var c=0; c<callbackObjs.length; c++ ) {
			callbackObj = callbackObjs[c];

			if ( callbackObj.callback === valProplistener_id ) {
				callbackObjs.splice( c , 1 );
				break;
			}
		}
	}
}

RouteState.removePropValueListenersViaClusterId = function ( cluster_id )
{
	if ( this.propValueClusters[cluster_id] ) {
		var callbacks = this.propValueClusters[cluster_id];
		for ( var c=0; c<callbacks.length; c++ ) {
			callback = callbacks[c];
			this.removePropValueListener( callback );
		}
		this.propValueClusters[cluster_id] = false;
		delete this.propValueClusters[cluster_id];
	}
}

RouteState.factory = function ( state )
{
	var routeStateRoute = new RouteStateRoute();

	for ( var i in state ) {
		if ( !RouteState.isFunction( i ) ) {
			if ( RouteState.isArray( state[i] ) ) {
				routeStateRoute[i] = [].concat( state[i] );
			}else{
				routeStateRoute[i] = state[i];
			}
		}
	}

	return routeStateRoute;
};

RouteState.routeFromPath = function ( path )
{
	return this.factory(
		this.objectFromPath( path )
	);
};

RouteState.objectFromPath = function ( path )
{
	var routeStateRoute = {};

	//get rid of shebang
	path = path.replace(/#!\//g,"");
	path = path.replace("]","");

	var dependencyArr = path.split("}[");
	path = dependencyArr[0];
	if ( dependencyArr.length > 1 ) {
		dependencyArr = dependencyArr[1].split(",");
	}else{
		path = path.replace("}","");
		dependencyArr = [];
	}

	var pathArr = path.split("/{");
	if ( pathArr.length < 2 ) {
		return routeStateRoute;
	}

	var names = pathArr[1];
	var vals = pathArr[0];

	var valsArr = vals.split("/");
	var namesArr = names.split(",");

	var state = {};
	var pair,name,name_arr,val,dependency,depName_arr;
	for ( var a=0; a<namesArr.length; a++ ) {
		name = namesArr[a];

		// deal with dependencies...they are index based versus name
		dependency = dependencyArr[a];
		if ( dependency ) {
			if ( !RouteState.config[name]) {
				RouteState.config[name] = {};
			}
			depName_arr = dependency.split(":");
			if ( depName_arr.length > 1 ) {
				dependency = namesArr[ depName_arr[0] ] + ":" + depName_arr[1];
			}else{
				dependency = namesArr[ dependency ];
			}
			RouteState.config[name].dependency = dependency;
		}

		// now put values together
		val = valsArr[a];
		if ( val && val.length > 0 && name && name.length > 0) {
			if ( val.indexOf( "," ) != -1 ) {// array
				routeStateRoute[name] = val.split(",");
			}else{
				routeStateRoute[name] = val;
			}
		}
	}

	return routeStateRoute;
};

// ===========HELPERS============
RouteState.isFunction = function( functionToCheck ) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck)
			=== '[object Function]';
};

RouteState.isArray = function( functionToCheck ) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck)
			=== '[object Array]';
};

RouteState.stateToObject = function ( state )
{
	var state_arr;
	var state_obj={
		name:false,
		dependency:false,
		relation:0// 0 = none, 1 = exists, 2 = exists and value
	};
	if ( state.indexOf(":") != -1 ) {
		state_arr = state.split(":");
		state_obj.name = state_arr[1];
		state_obj.dependency = state_arr[0];
		state_obj.relation = 2;
	}else if ( state.indexOf(".") != -1 ) {
		state_arr = state.split(".");
		state_obj.name = state_arr[1];
		state_obj.dependency = state_arr[0];
		state_obj.relation = 1;
	}else{
		state_obj.name = state;
		state_obj.dependency = false;
		state_obj.relation = 0;
	}

	return state_obj;
}

// ===========ROUTE OPERATORS============
RouteState.merge = function ( overrides , replace_arrays )
{
	if ( this.route ) {
		overrides = RouteState.processObjectForDependencies( overrides );
		var new_route = this.route.clone( overrides , replace_arrays );
		RouteState.updateRoute( new_route );
		new_route.toHash();
	}
};

RouteState.replace = function ( state )
{
	state = RouteState.processObjectForDependencies( state );
	var new_route = RouteState.factory( state );
	RouteState.updateRoute( new_route );
	new_route.toHash();
};

RouteState.processObjectForDependencies = function ( overrides )
{
	var state_obj,new_overrides={};
	for ( var name in overrides ) {
		state_obj = RouteState.stateToObject( name );
		new_overrides[ state_obj.name ] = overrides[name];
		switch ( state_obj.relation ) {
			case 1:
				RouteState.tieToProp(
					state_obj.name,
					state_obj.dependency
				);
				break;
			case 2:
				RouteState.tieToPropAndValue(
					state_obj.name,
					state_obj.dependency,
					overrides
				);
				break;
			default:
				RouteState.removeTies( name );
				break;
		}
	}
	return new_overrides;
}

RouteState.removeTies = function ( source )
{
	if ( !RouteState.config[source]) {
		RouteState.config[source] = {};
	}
	delete RouteState.config[source].dependency;
};

RouteState.tieToProp = function ( source , target )
{
	if ( !RouteState.config[source]) {
		RouteState.config[source] = {};
	}
	RouteState.config[source].dependency = target;
};

RouteState.tieToPropAndValue = function ( source, target, overrides )
{
	if ( !RouteState.config[source]) {
		RouteState.config[source] = {};
	}

	if (
		( RouteState.route && RouteState.route[ target ] )  ||
		( overrides && overrides[ target ] )
	) {
		var target_value;
		// overrides should take precedence...
		// they are going to be a part of the new route.
		if ( overrides[ target ] ) {
			target_value = overrides[ target ];
		}else{
			target_value = RouteState.route[target];
		}

		RouteState.config[source].dependency =
			target + ":" + target_value;

	}else{
		RouteState.tieToProp( source , target );
	}
};

// these are all operating on top of merge...
RouteState.toggle = function ( state , other_state , replace_arrays )
{
	var state_obj;
	for ( var name in state ) {

		state_obj = RouteState.stateToObject( name );

		if ( this.isArray( state[name] ) ) {
			if ( !this.route[state_obj.name] ) {
				this.route[state_obj.name] = [];
			}
			if ( !RouteState.isArray( this.route[state_obj.name] ) ) {
				this.route[state_obj.name] = [].concat( this.route[state_obj.name] );
			}

			var sub_name;
			for ( var i=0; i<state[name].length; i++ ) {
				sub_name = state[name][i];
				if ( this.route[state_obj.name].indexOf( sub_name ) == -1 ) {
					this.merge( state , replace_arrays );
					return;
					break;
				}
			}
		}else{
			if ( this.route[state_obj.name] != state[name] ) {
				this.merge( state , replace_arrays );
				return;
				break;
			}
		}
	}

	// if it made it this far it is the latter state
	this.merge( other_state , replace_arrays );
};
/*
RouteState.toggleIfThen = function (
	cond_state,
	if_state , then_state ,
	replace_arrays
)
{
	for ( var name in cond_state ) {
		if ( this.isArray( cond_state[name] ) ) {
			if ( !this.route[name] ) {
				this.route[name] = [];
			}
			if ( !RouteState.isArray( this.route[name] ) ) {
				this.route[name] = [].concat( this.route[name] );
			}

			var sub_name;
			for ( var i=0; i<cond_state[name].length; i++ ) {
				sub_name = cond_state[name][i];

				if ( this.route[name].indexOf( sub_name ) == -1 ) {
					this.merge( if_state , replace_arrays );
					return;
					break;
				}
			}
		}else{
			if ( this.route[name] != cond_state[name] ) {
				this.merge( if_state , replace_arrays );
				return;
				break;
			}
		}
	}

	this.merge( then_state , replace_arrays );
};
*/
// ===========END ROUTE OPERATORS============

RouteState.debug = function ()
{
	$(".routestate_debug").remove();
	var html = ["width" + $(window).width() + " | height" + $(window).height()];
	var depends;
	for ( var i in this.route ) {
		if ( !RouteState.isFunction( this.route[i] ) ) {

			depends = "";
			if ( RouteState.config[i] && RouteState.config[i].dependency ) {
				depends = " (depends on '" + RouteState.config[i].dependency + "')";
			}

			if ( RouteState.isArray( this.route[i] ) ) {
				html.push(
					i + " = "
					+ this.route[i].join(",<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
					+ depends
				);
			}else{
				html.push( i + " = " + this.route[i] + depends);
			}

		}
	}

	$("body").append("<div onclick='$(\".routestate_debug\").remove();'"
				+" class='routestate_debug'"
				+" style='padding: 10px; border: 1px solid grey;"
				+" width:300px; height: auto; background-color: #fff;"
				+" position: fixed; top: 10px;"
				+" right: 10px; z-index: 2000000;'>"
				+html.join("<br/>")
				+ "</div>");
};

// ===========ROUTE STACK==================
RouteState.push = function () {
	this.route_stack.push( this.route.clone() );
	return this;
};

RouteState.pop = function () {
	if ( this.route_stack.length > 0 ) {
		this.replace( this.route_stack.pop() );
	}else{
		console.log("RouteState: nothing left in the stack.");
	}
	return this;
};






// ============================================
// ========== RouteStateRoute =================
// ============================================

var RouteStateRoute = function(){};

RouteStateRoute.prototype.toHash = function () {
	var routeStr = this.toHashString();
	RouteState.target_document.location.hash = routeStr;
};

// ===========SERIALIZERS==================
RouteStateRoute.prototype.toHashString = function () {

	var route_config;
	var routeObj = this.toObject();
	var routeArr = [];
	var default_weight = 100000;
	for ( var name in routeObj ) {
		// see if we are supposed to show this...
		// make sure to get the top most config...
		route_config = RouteState.config[name];

		if ( route_config ) {
			// ignore this if it shouldn't be in hash
			if (
				typeof route_config.show_in_hash !== 'undefined'
				&& route_config.show_in_hash == false
			) {
				continue;
			}
		}else{
			route_config = {
				weight:default_weight
			};
		}

		var weight = ( route_config.weight )
						? route_config.weight : default_weight;

		if ( RouteState.isArray( routeObj[name] ) ) {
			routeArr.push({
				name:name,
				val:routeObj[name].join(","),
				weight:weight
			});
		}else{
			routeArr.push({
				name:name,
				val:routeObj[name],
				weight:weight
			});
		}
	}

	// sort according to weight
	routeArr.sort( function (a,b) {
		if (a.weight < b.weight)
			return -1;
		if (a.weight > b.weight)
			return 1;
		return 0;
	});

	var nameArr = [];
	var nameLookup = {};
	var valArr = [];
	var dependancyArr = [];

	// finally put it all together in correct order...
	$( routeArr ).each(
		function ( index, value ) {
			nameArr.push( value.name );
			valArr.push( value.val );
			nameLookup[ value.name ] = index;

			/*if ( RouteState.config && RouteState.config[value.name] ) {
				dependancyArr.push( RouteState.config[value.name].dependency );
			}else{
				dependancyArr.push( "" );
			}*/
		}
	);

	// now add dependencies, but via index of the name...
	var depName_arr,show_dependencies = false;
	$( routeArr ).each(
		function ( index, value ) {
			if (
				RouteState.config &&
				RouteState.config[value.name] &&
				RouteState.config[value.name].dependency
			) {
				depName_arr = RouteState.config[value.name].dependency.split(":");
				if ( depName_arr.length > 1 ) {
					dependancyArr.push( nameLookup[ depName_arr[0] ] + ":" + depName_arr[1] );
					show_dependencies = true;
				}else{
					dependancyArr.push( nameLookup[ depName_arr[0] ] );
					show_dependencies = true;
				}
			}else{
				dependancyArr.push( "" );
			}
		}
	);

	if ( valArr.length > 0 ) {
		if ( show_dependencies ) {
			return "#!/" + valArr.join("/") + "/{" + nameArr.join(",") + "}[" + dependancyArr.join(",") + "]";
		}else{
			return "#!/" + valArr.join("/") + "/{" + nameArr.join(",") + "}";
		}
	}else{
		return "";
	}
};

RouteStateRoute.prototype.serializedToBodyClasses = function ( prefix ) {
	var body_classes = [];

	//put pathname in there...
	//pathname always has a preceeding slash
	body_classes.push(
		prefix + "pathname"
		+ RouteState.target_document
			.location.pathname
			.replace( /\//g , "_" ).replace( /\./g , "_" )
	);

	var routeObj = this.toObject();
	for ( var name in routeObj ) {
		// see if we are supposed to show this...
		route_config = RouteState.config[name];
		if ( route_config ) {
			if (
				typeof route_config.show_in_body !== 'undefined'
				&& route_config.show_in_body == false
			) {
				continue;
			}
		}

		if ( RouteState.isArray( routeObj[name] ) ) {
			var element;
			for ( var e=0; e<routeObj[name].length; e++ ) {
				element = routeObj[name][e];
				body_classes.push( prefix + name + "_" + element );
			}
		}else{
			body_classes.push( prefix + name + "_" + routeObj[name] );
		}

		// just a name, boolean lookup thing
		body_classes.push( prefix + name );
	}

	if ( body_classes.length == 0 ) {
		body_classes.push( prefix + "empty");
	}
	return body_classes.join(" ");
}

RouteStateRoute.prototype.cleanRoute = function () {
	var dependancy_hits = 0,dependency_arr;
	for ( var name in this ) {
		if (
			!RouteState.isFunction( this[name] )
		) {

			route_config = RouteState.config[name];
			if ( route_config && typeof route_config.dependency !== 'undefined' ) {

				// ignore this if it has a missing dependancy
				dependency_arr = route_config.dependency.split(":");
				if ( dependency_arr.length > 1 ) {
					if (
						!this[dependency_arr[0]] ||
						String( this[dependency_arr[0]] ) != String( dependency_arr[1] )
					) {
						dependancy_hits++;
						delete this[name];
					}
				}else{
					if (
						!this[ route_config.dependency ]
					){
						dependancy_hits++;
						delete this[name];
					}
				}
			}

			// clean out empty values...
			if ( !this[name] || this[name] == "" ) {
				delete this[name];
			}
		}
	}

	if ( dependancy_hits > 0 ) {
		this.cleanRoute();
	}
}

RouteStateRoute.prototype.toObject = function () {
	var routeObj = {};
	for ( var name in this ) {
		if (
			!RouteState.isFunction( this[name] )
		) {
			routeObj[name] = this[name];
		}
	}
	return routeObj;
};
// ===============END SERIALIZERS=============

RouteStateRoute.prototype.toElementClass = function ( element , prefix ) {
	var body_class = $( element ).attr('class');
	if ( body_class ) {
		var classList = body_class.split(/\s+/);
		$.each( classList, function(index, item){
		    if ( item.indexOf( prefix ) == 0  ) {
		       $( element ).removeClass( item );
		    }
		});
	}

	$( element ).addClass( this.serializedToBodyClasses( prefix ) );
};

/*
// Needs to be managed by RouteState Singleton...
RouteStateRoute.prototype.toBodyClass = function () {
	if ( RouteState.inject_body_class ) {
		this.toElementClass( "body" );
	}
};
*/

RouteStateRoute.prototype.clone = function ( overrides , replace_arrays  ) {
	var routeState = RouteState.factory( this );

	if ( !replace_arrays ) {
		replace_arrays = false;
	}

	if ( overrides ) {
		for ( var i in overrides ) {
			if ( !RouteState.isFunction( overrides[i] ) ) {
				if ( RouteState.isArray( overrides[i] ) ) {
					if ( replace_arrays ) {
						routeState[i] = [].concat( overrides[i] );
					}else{

						if ( !routeState[i] ) {
							routeState[i] = [];
						}
						if ( !RouteState.isArray( routeState[i] ) ) {
							routeState[i] = [].concat( routeState[i] );
						}

						var override;
						for ( var p=0; p<overrides[i].length; p++ ) {
							override = String( overrides[i][p] );
							if ( override.indexOf("-") == 0 ) {
								override = override.replace("-","");
								var index = routeState[i].indexOf(override);
								if (index > -1) {
									routeState[i].splice(index, 1);
								}
							}else{
								if ( routeState[i].indexOf( override ) == -1 ) {
									routeState[i].push( override );
								}
							}
						}
					}
				}else{
					routeState[i] = overrides[i];
				}
			}
		}
	}
	return routeState;
};
