module.exports = {
  resolver: {
    extraNodeModules: {
      	// Polyfills for node libraries
      	"constants": require.resolve("constants-browserify"),
	    "crypto": require.resolve("crypto-browserify"),
	    "dns": require.resolve("node-libs-browser/mock/dns"),
	    "domain": require.resolve("domain-browser"),
	    "fs": require.resolve("node-libs-browser/mock/empty"),
	    "http": require.resolve("stream-http"),
	    "https": require.resolve("https-browserify"),
	    "os": require.resolve("os-browserify/browser"),
	    "path": require.resolve("path-browserify"),
	    "querystring": require.resolve("querystring-es3"),
	    "stream": require.resolve("stream-browserify"),
	    "_stream_duplex": require.resolve("readable-stream/duplex"),
	    "_stream_passthrough": require.resolve("readable-stream/passthrough"),
	    "_stream_readable": require.resolve("readable-stream/readable"),
	    "_stream_transform": require.resolve("readable-stream/transform"),
	    "_stream_writable": require.resolve("readable-stream/writable"),
	    "sys": require.resolve("util"),
	    "timers": require.resolve("timers-browserify"),
	    "tls": require.resolve("node-libs-browser/mock/tls"),
	    "tty": require.resolve("tty-browserify"),
	    "vm": require.resolve("vm-browserify"),
	    "zlib": require.resolve("browserify-zlib"),
    }
  },
  // other metro config, etc
}