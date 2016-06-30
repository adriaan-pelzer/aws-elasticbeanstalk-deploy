#!/usr/bin/env node

var R = require ( 'ramda' );
var H = require ( 'highland' );
var W = require ( 'highland-wrapcallback' );
var A = require ( 'aws-sdk' );
var S = new A.S3 ( { region: 'eu-west-1' } );
var E = new A.ElasticBeanstalk ( { region: 'eu-west-1' } );
var F = require ( 'fs' );
var I = require ( 'inspect-log' );

var Bucket = 'elasticbeanstalk-code.eip.telegraph.co.uk';

if ( process.argv.length < 7 ) {
    console.log ( 'Usage: elasticbeanstalk-deploy <zipfile> <application name> <environment name> <version description> <version label>' );
    process.exit ( 1 );
}

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
                I ( ETag );
                return {
                    ApplicationName: process.argv[3],
                    AutoCreateApplication: false,
                    Description: process.argv[5],
                    Process: true,
                    SourceBundle: {
                        S3Bucket: Bucket,
                        S3Key: Key
                    },
                    VersionLabel: process.argv[6]
                };
            } )
            .flatMap ( W ( E, 'createApplicationVersion' ) )
            .map ( function ( data ) {
                I ( data );
                return {
                    ApplicationName: process.argv[3],
                    VersionLabels: [
                        process.argv[6]
                    ]
                };
            } )
            .flatMap ( W ( E, 'describeApplicationVersions' ) )
            .map ( function ( data ) {
                I ( data );
                return {
                    ApplicationName: process.argv[3],
                    EnvironmentName: process.argv[4],
                    VersionLabel: process.argv[6]
                };
            } )
            .flatMap ( W ( E, 'updateEnvironment' ) );
    } )
    .errors ( R.unary ( console.error ) )
    .each ( console.log );
