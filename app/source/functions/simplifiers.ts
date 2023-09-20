import * as fs from 'fs-extra';

import { error, info } from 'console';

/*
 * Function of an custom output with date UTC timings and date:
 ==============================================================
 * added custom checker for error's interface, so console will scream the error out nor
 * just send as an output an object.
 */

export function out(audit: any) {

    /*
     * We are using some types misunderstanding, so there are some formulae:
     *
     * TYPEOF(ERROR) == TYPEOF(STRING) => FALSE;
     * TYPEOF(ERROR) == TYPEOF(OBJECT) => TRUE;
     */

    if(typeof(audit) == typeof(""))
        info(new Date().toLocaleString() + ' - ' + audit);
    else
        error(new Date().toLocaleString() + ' - ' + `${audit}`);
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
 * Function of parsing time in required format via specified key.
 ================================================================
 * Every case returns a number from which, in case of need, bot can
 * recreate an UTC or Offset timing.
 */

export function get_time(key: string) {

    const DATE = new Date();
    
    /*
     * Undefined-check is included into switch construction.
     */
    
    switch(key) {
        case 'time':
            return DATE.getTime();
        case 'offset':
            return DATE.getTimezoneOffset();
        case 'days':
            return DATE.getDay();
        case 'hour':
            return DATE.getHours();
        case 'utc-time':
            return DATE.getUTCDate();
    }

    return 0;
}