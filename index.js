/**
 * 
 */
window.onload = function() {
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
    function createImage(offset) {
        artist.plot_column();
    }
 
    // Main loop
    function main(tframe) {
       
 
        // Create the image
        createImage(Math.floor(tframe / 10));
 
        // Draw the image data to the canvas
        context.putImageData(imagedata, 0, 0);
        
        // Request animation frames
        window.requestAnimationFrame(main);
    }
 
    // Call the main loop
    main(0);
};