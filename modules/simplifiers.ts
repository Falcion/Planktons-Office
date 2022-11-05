import * as fs from 'fs-extra';

/*
 * Function of an custom output with date UTC timings and date:
 ==============================================================
 * added custom checker for error's interface, so console will scream the error out nor
 * just send as an output an object.
 */

export function out(message: string) {
    console.info(new Date().toLocaleString() + ' - ' + message);
}

/*
 * Function of reading an JSON file and parsing json object (or array).
 ======================================================================
 * Just stringifying buffer via checking is given path a JSON contents.
 */

export async function read_json(path: string) {

    /* 
     * We are not checking on type, because code must do it by itself.
     */
    
    const data = await fs.readFile(__dirname + './../' + path);

    if(!data)
        throw new Error('Empty either non-existing file!');

    const dataJSON = JSON.parse(data.toString());

    return dataJSON;
}

/*
 * Function of counting an array's elements which satisfy equality to given flag.
 ======================================================================
 * Function of this gets ANY types because user's input could be any: from boolean
 * to string or even some custom objects, so, in some case, we check the first element
 * of an array on type with flag.
 * 
 * Choose first value of an array because its must be one-type array and not-undefined.
 */

export function count(array: any[], flag: any) {
    
    /*
     * We are not checking on types and other, because filter does it by itself
     * and when it got undefined array, it gets parsed by is-good function.
     */

    const tagged_array = array.filter(x => x === flag);

    if(!tagged_array)
        return 0;
    else
        return tagged_array.length;
}

/* 
 * One-string function to get a UTC time's number in LONG-LONG int.
 ============================================================
 */

export function get_time() { return new Date().getTime(); }