/**
 * 
 */
window.onload = function() {
	var running=true;
	
	var controls = document.getElementById("controls");
	controls.style.display="block";
	
    // Get the canvas and context
    var canvas = document.getElementById("mountains"); 
    var context = canvas.getContext("2d");
 
    // Define the image dimensions
    var width = canvas.width;
    var height = canvas.height;
  
 
    // Create an ImageData object
    var imagedata = context.createImageData(width, height);
    var mount = new Mountain();
    var artist = new Artist(imagedata,width,height,mount);
    // Create the image
    function createImage() {
        artist.plot_column();
    }
 
    // Main loop
    function main() {
       
 
        // Create the image
        createImage();
 
        // Draw the image data to the canvas
        context.putImageData(imagedata, 0, 0);
        
        if( running ){
         // Request animation frames
         window.requestAnimationFrame(main);
        }
    }
    
    var table = document.createElement("table");
    controls.appendChild(table);
    
    function add_row(text,c){
    	var row = document.createElement("tr");
    	table.appendChild(row);
    	var a = document.createElement("td");
    	a.innerHTML=text;
    	row.appendChild(a);
    	var b = document.createElement("td");
    	b.appendChild(c);
    	row.appendChild(b);
    };
    
    //var button = document.getElementById("toggle");
    var button = document.createElement("button");
    button.innerHTML="Stop"
    button.onclick = function(){
    	running = ! running;
    	if( running ){
    		this.innerHTML="Stop";
    		main();
    	}else{
    		this.innerHTML="Start";
    	}
    }
    add_row("Run control",button);
    
    var fdim = document.createElement("input");
    fdim.setAttribute("type","number");
    fdim.setAttribute("min","0.5");
    fdim.setAttribute("max","1.0");
    fdim.setAttribute("step","0.01");
    fdim.setAttribute("value",mount.fdim);
    
    fdim.onchange=function(){
    	if( fdim.checkValidity()){
    		mount.set_fdim(fdim.value);
    	}
    }
    add_row("Fractal dimension",fdim);
    
    
    var map = document.createElement("input")
    map.setAttribute("type","checkbox");
    map.checked=artist.draw_map;
    map.onchange=function(){
    	artist.draw_map=this.checked;
    }
    add_row("Draw map",map);
    
    var reflec = document.createElement("input")
    reflec.setAttribute("type","checkbox");
    reflec.checked=artist.reflec;
    reflec.onchange=function(){
    	artist.reflec=this.checked;
    }
    add_row("Draw reflections",reflec);
    // Call the main loop
    main();
};