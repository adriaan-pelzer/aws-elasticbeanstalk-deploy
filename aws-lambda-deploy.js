#!/usr/bin/env node

var R = require ( 'ramda' );
var H = require ( 'highland' );
var W = require ( 'highland-wrapcallback' );
var A = require ( 'aws-sdk' );
var S = new A.S3 ( { region: 'eu-west-1' } );
var L = new A.Lambda ( { region: 'eu-west-1' } );
var F = require ( 'fs' );
var I = require ( 'inspect-log' );

var Bucket = 'lambda-functions.eip.telegraph.co.uk';

H ( [ process.argv[2] ] )
    .flatMap ( function ( fileName ) {
        var Key = R.last ( R.split ( '/', fileName ) );

        return H.wrapCallback ( F.readFile )( fileName )
            .map ( function ( body ) {
                return {
                    Bucket: Bucket,
                    Key: Key,
                    Body: body
                };
            } )
            .flatMap ( W ( S, 'putObject' ) )
            .map ( function ( ETag ) {
                return {
                    FunctionName: process.argv[3],
                    S3Bucket: Bucket,
                    S3Key: Key
                };
            } )
            .flatMap ( W ( L, 'updateFunctionCode' ) );
    } )
    .errors ( R.unary ( console.error ) )
    .each ( console.log );
