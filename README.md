
# RouteState

## Synopsis

RouteState is a flexible path router (designed for prototyping) that serializes it's state into the path as well as into the class of the body. It has an event listening system as well as a way to tolerantly configure the path (it's optional and can easily be added at any time). This results in a very flexible state management system that enables you to layout and animate your UI almost entirely
via CSS.

## Installation


1. add routestate to your package.json and install via script tag
2. initiate RouteState with "listenToHash"
3. (add configuration when you have a solid idea of your path)


### Examples
```JAVASCRIPT
// init
RouteState.listenToHash();

// Add a listener ( name of value, closure call back, and cluster id)
RouteState.addDiffListener(
    "page",
    function( route , prev_route ){
        // do something
    },
    "myPageName"
);
```

```HTML
// In your HTML call (bind however you like):
<div onclick="RouteState.merge({page:'home'})">
    Go Home
</div>
<div onclick="RouteState.toggle({page:'home'},{last:''})">
    Toggle Page
</div>
<div onclick="RouteState.merge({'page.tab':'other'})">
    Change Tabs and connect existence of tab state to existence of page state
</div>
<div onclick="RouteState.merge({'page:tab':'other'})">
    Change Tabs and connect existence of tab state to existence of page and it's specific value when called
</div>
```

```JAVASCRIPT
// Your hash will look like this:
// / values /{ names }[ dependencies(indexes) ]
#!/home/other{page,tab}[,0:]
// in this state:
// page = 'home' and tab = 'other'.
// tab is also dependent on page existing and page's value being 'home' ( b/c of added ":" )
```

```HTML
<!-- ...and your body's class will look like this: -->
<body class="s_page s_page_home">

<!-- if you had a previous page: -->
<body class="s_page s_page_home sp_home sp_page_search">

```



```CSS
/* Now construct your layout entirely in CSS */
/* (implies using LESS) */

.myHomePage {
    display: none;

    body.s_page_home & {
        display: block;
    }
}

/* ...or something with some animation */
.myHomePage {
    width: 0px;
    transition: width .3s;

    body.s_page_home & {
        width: 50%;
    }
}

/* ...or something more fancy */
.myHomePage {
    width: 0px;

    body.s_page_home & {
        width: 50%;
    }
    body.sp_page_search.s_page_home & {
        /* only animate when coming from search page... */
        transition: width .3s;
    }
}

```

```JAVASCRIPT

// clean up when done...
RouteState.removeDiffListenersViaClusterId("myPageName");

```

```JAVASCRIPT

// if you want to configure later...
var route_config = {
    page:{
        weight:10, // sort based on weight
        values:[ // have some idea of variations (doesn't restrict)
            "home",
            "search"
        ],
        show_in_hash:true, // show in the hash...keeps out of history
        show_in_body:true // show in the body
    },
    last:{
        weight:20,
        values:[],
        show_in_body:true,
        show_in_hash:false,
        dependency:"page"
    },
};
RouteState.config( route_config );

```

```JAVASCRIPT
// for React...

componentWillMount: function(){
    var me = this;
    RouteState.addDiffListeners(
		["page","project"],
		function ( route , prev_route ) {
            me.forceUpdate();
		},
        "myPageName"
	);
},

componentWillUnmount: function(){
    RouteState.removeDiffListenersViaClusterId( "myPageName" );
},

```
