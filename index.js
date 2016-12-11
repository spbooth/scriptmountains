/**
 * 
 */
window.onload = function() {
	var running=true;
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
    var button = document.getElementById("toggle");
    button.onclick = function(){
    	running = ! running;
    	if( running ){
    		this.innerHTML="Stop";
    		main();
    	}else{
    		this.innerHTML="Start";
    	}
    }
    
    // Call the main loop
    main();
};