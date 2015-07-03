
/*

#TODO Abstract the Route object...functions are conflicting with array
#TODO clean up references to top document...make optional?

*/


var RouteState = function(){};

RouteState.route;
RouteState.prev_route;

RouteState.inject_body_class = true;

RouteState.ROUTE_CHANGE_EVENT = "ROUTE_CHANGE_EVENT";

RouteState.config = {};
RouteState.config = function ( config )
{
	this.config = config;
}

RouteState.doneFunk;
RouteState.DOMs = [];
RouteState.listenToHash = function ( funk )
{
	// establish this as a singleton (across frames)
	this.target_window = window;
	this.target_document = document;
	if (
		window.top != window.self
		&& window.top.document.domain
			== window.self.document.domain
	) {
		this.target_window = window.top;
		this.target_document = window.top.document;

		// if there is some race condition...
		if ( !this.target_window.RouteState ) {
			this.target_window.RouteState = this;
			RouteState.DOMs.push( this.target_document );
		}
		window.RouteState = this.target_window.RouteState;
	}

	RouteState.target_window = this.target_window;
	RouteState.target_document = this.target_document;

	RouteState.DOMs.push( document );
	var me = RouteState;

	RouteState.doneFunk = funk;
	$( this.target_window ).on('hashchange',function() {
		// this is duplicating change...
		var clone = RouteState.route.clone(
			RouteState.objectFromPath(
				RouteState.target_document.location.hash
			)
		);

		// if it is different, then it came from user...
		if (
			clone.toHashString()
			!= RouteState.route.toHashString()
		) {
			RouteState.updateRoute( clone );
		}
	});

	// kick this off...
	RouteState.updateRoute(
		RouteState.routeFromPath( RouteState.target_document.location.hash )
	);
};

RouteState.unlistenHash = function ()
{
	$(window).off('hashchange');
};


RouteState.updateRoute = function ( new_route )
{
	if ( this.route ) {
		this.prev_route = this.route;
	}else{
		this.prev_route = this.factory();
	}

	this.route = new_route;
	var me = this;
	$( this.DOMs ).each( function ( index , value ) {
		me.route.toElementClass( $( value ).find("body") );
	});

	this.checkDiffListeners();
	this.checkPropValueListeners();

	if ( this.doneFunk ) {
		this.doneFunk( this.route , this.prev_route );
	}
};



// Diff listener
RouteState.diffListeners = {};
RouteState.addDiffListener = function ( prop , callback )
{
	if ( !this.diffListeners[ prop ] ) {
		this.diffListeners[ prop ] = [];
	}
	this.diffListeners[ prop ].push( callback );
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


RouteState.propValueListeners = {};
RouteState.addPropValueListener = function ( prop , value , callback , exitcallback )
{
	if ( !this.propValueListeners[ prop ] ) {
		this.propValueListeners[ prop ] = [];
	}
	this.propValueListeners[ prop ].push( {value:value,callback:callback,exitcallback:exitcallback} );
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
						callbackObj.exitcallback( this.route , this.prev_route );
					}

					if (
						this.route[prop] == callbackObj.value &&
						this.prev_route[prop] != callbackObj.value
					) {
						callbackObj.callback( this.route , this.prev_route );
					}
				}
			}else{

				// call them all there is no prev route....
				for ( var c=0; c<callbackObjs.length; c++ ) {
					callbackObj = callbackObjs[c];
					callbackObj.callback( this.route , this.prev_route );
				}
			}
		}
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
	path = path.replace(")","");

	var pathArr = path.split("/(");

	if ( pathArr.length < 2 ) {
		return routeStateRoute;
	}

	var names = pathArr[1];
	var vals = pathArr[0];

	var valsArr = vals.split("/");
	var namesArr = names.split(",");

	var state = {};
	var pair,name,val;
	for ( var a=0; a<namesArr.length; a++ ) {
		name = namesArr[a];
		val = valsArr[a];
		if ( val && val.length > 0 && name && name.length > 0) {
			if ( val.indexOf( "," ) != -1 ) {
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

// ===========ROUTE OPERATORS============
RouteState.merge = function ( overrides , replace_arrays )
{
	if ( this.route ) {
		var new_route = this.route.clone( overrides , replace_arrays );
		RouteState.updateRoute( new_route );
		new_route.toHash();
	}
};

RouteState.replace = function ( state )
{
	var new_route = RouteState.factory( state );
	RouteState.updateRoute( new_route );
	new_route.toHash();
};

// these are all operating on top of merge...
RouteState.toggle = function ( state , other_state , replace_arrays )
{
	for ( var name in state ) {
		if ( this.isArray( state[name] ) ) {
			if ( !this.route[name] ) {
				this.route[name] = [];
			}
			if ( !RouteState.isArray( this.route[name] ) ) {
				this.route[name] = [].concat( this.route[name] );
			}

			var sub_name;
			for ( var i=0; i<state[name].length; i++ ) {
				sub_name = state[name][i];

				if ( this.route[name].indexOf( sub_name ) == -1 ) {
					this.merge( state , replace_arrays );
					return;
					break;
				}
			}
		}else{
			if ( this.route[name] != state[name] ) {
				this.merge( state , replace_arrays );
				return;
				break;
			}
		}
	}

	this.merge( other_state , replace_arrays );
};

RouteState.toggleIfThen = function ( cond_state , if_state , then_state , replace_arrays )
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
// ===========END ROUTE OPERATORS============


RouteState.debug = function ()
{
	$(".routestate_debug").remove();
	var html = ["width" + $(window).width() + "|height" + $(window).height()];
	for ( var i in this.route ) {
		if ( !RouteState.isFunction( this.route[i] ) ) {
			if ( RouteState.isArray( this.route[i] ) ) {
				html.push(
					i + " = "
					+ this.route[i].join(",<br/>&nbsp;&nbsp;&nbsp;&nbsp;")
				);
			}else{
				html.push( i + " = " + this.route[i] );
			}
		}
	}

	$("body").append("<div onclick='$(\".routestate_debug\").remove();' class='routestate_debug' style='padding: 10px; border: 1px solid grey; width:300px; background-color: #fff;position: fixed; top: 10px; left: 10px; z-index: 2000000;'>" +html.join("<br/>")+ "</div>");
};

//Route State instance....
//RouteStateRoute
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
	var valArr = [];

	// finally put it all together in correct order...
	$( routeArr ).each(
		function ( index, value ) {
			nameArr.push( value.name );
			valArr.push( value.val );
		}
	);


	//return routeArr.join("/");
	if ( valArr.length > 0 ) {
		return "#!/" + valArr.join("/") + "/(" + nameArr.join(",") + ")";
	}else{
		return "";
	}
};

RouteStateRoute.prototype.serializedToBodyClasses = function () {
	var body_classes = [];

	//put pathname in there...
	//pathname always has a preceeding slash
	body_classes.push(
		"s_pathname"
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
				body_classes.push( "s_" + name + "_" + element );
			}
		}else{
			body_classes.push( "s_" + name + "_" + routeObj[name] );
		}

		// just a name, boolean lookup thing
		body_classes.push( "s_" + name );
	}


	if ( body_classes.length == 0 ) {
		body_classes.push("s_empty");
	}
	return body_classes.join(" ");
}


RouteStateRoute.prototype.toObject = function () {
	var routeObj = {};
	for ( var name in this ) {
		if (
			!RouteState.isFunction( this[name] )
			&& this[name]
			&& String( this[name] ).length > 0
		) {

			route_config = RouteState.config[name];
			if ( route_config ) {
				// ignore this if it has a missing dependancy
				if (
					typeof route_config.dependency !== 'undefined'
					&& !this[route_config.dependency]
				){
					continue;
				}
			}

			routeObj[name] = this[name];
		}
	}
	return routeObj;
};




// ===============END SERIALIZERS=============





RouteStateRoute.prototype.toElementClass = function ( element ) {
	var body_class = $( element ).attr('class');
	if ( body_class ) {
		var classList = body_class.split(/\s+/);
		$.each( classList, function(index, item){
		    if ( item.indexOf( 's_' ) == 0  ) {
		       $( element ).removeClass( item );
		    }
		});
	}

	$( element ).addClass( this.serializedToBodyClasses() );
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
							override = overrides[i][p];
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
