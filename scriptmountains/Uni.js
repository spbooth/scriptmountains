/**
 * 
 */

"use strict";


function nextGaussian()
{
	var ran1, ran2;

	for( ran1=0.0 ; ran1 == 0.0 ; ){
		ran1 =  Math.random();
	}

	ran2 = Math.random();
	return ( Math.sqrt(-2.0 * Math.log(ran1)) * Math.cos(2.0 * Math.PI * ran2) );
}

