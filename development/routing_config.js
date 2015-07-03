


var route_config = {
    page:{
        weight:10,
        values:[
            "test",
            "again"
        ],
        show_in_hash:true,
        show_in_body:true
    },
    last:{
        weight:20,
        values:[],
        show_in_body:true,
        show_in_hash:true,
        dependency:"page"
    },
    bodyhidden:{
        show_in_body:false
    },
    dogfur:{
        show_in_body:true,
        show_in_hash:false
    },
    arr:{
        weight: 1
    }
};
