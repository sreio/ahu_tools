export namespace main {
	
	export class Config {
	    id: number;
	    environment: string;
	    key: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.environment = source["environment"];
	        this.key = source["key"];
	        this.description = source["description"];
	    }
	}
	export class DecryptRequest {
	    environment: string;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new DecryptRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.environment = source["environment"];
	        this.data = source["data"];
	    }
	}
	export class DecryptResponse {
	    success: boolean;
	    data?: any;
	    raw?: string;
	    isJson: boolean;
	    environment: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DecryptResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = source["data"];
	        this.raw = source["raw"];
	        this.isJson = source["isJson"];
	        this.environment = source["environment"];
	        this.error = source["error"];
	    }
	}
	export class DownloadAsset {
	    name: string;
	    url: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new DownloadAsset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.url = source["url"];
	        this.size = source["size"];
	    }
	}
	export class DownloadUpdateResponse {
	    success: boolean;
	    cancelled: boolean;
	    path?: string;
	    message?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new DownloadUpdateResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.cancelled = source["cancelled"];
	        this.path = source["path"];
	        this.message = source["message"];
	        this.error = source["error"];
	    }
	}
	export class H5DecryptConfig {
	    id: number;
	    environment: string;
	    description: string;
	    request_aes_256_cbc_iv: string;
	    request_aes_256_cbc_key: string;
	    server_rsa_private_key: string;
	    response_aes_256_cbc_iv: string;
	    response_aes_256_cbc_key: string;
	    client_rsa_private_key: string;
	
	    static createFrom(source: any = {}) {
	        return new H5DecryptConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.environment = source["environment"];
	        this.description = source["description"];
	        this.request_aes_256_cbc_iv = source["request_aes_256_cbc_iv"];
	        this.request_aes_256_cbc_key = source["request_aes_256_cbc_key"];
	        this.server_rsa_private_key = source["server_rsa_private_key"];
	        this.response_aes_256_cbc_iv = source["response_aes_256_cbc_iv"];
	        this.response_aes_256_cbc_key = source["response_aes_256_cbc_key"];
	        this.client_rsa_private_key = source["client_rsa_private_key"];
	    }
	}
	export class H5DecryptRequest {
	    environment: string;
	    mode: string;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new H5DecryptRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.environment = source["environment"];
	        this.mode = source["mode"];
	        this.data = source["data"];
	    }
	}
	export class H5DecryptResponse {
	    success: boolean;
	    data?: any;
	    raw?: string;
	    isJson: boolean;
	    mode?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new H5DecryptResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = source["data"];
	        this.raw = source["raw"];
	        this.isJson = source["isJson"];
	        this.mode = source["mode"];
	        this.error = source["error"];
	    }
	}
	export class InstallUpdateResponse {
	    success: boolean;
	    message?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new InstallUpdateResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.error = source["error"];
	    }
	}
	export class ToolHistory {
	    id: number;
	    toolKey: string;
	    action: string;
	    success: boolean;
	    inputSnapshot: string;
	    inputSummary: string;
	    schemaVersion: number;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new ToolHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.toolKey = source["toolKey"];
	        this.action = source["action"];
	        this.success = source["success"];
	        this.inputSnapshot = source["inputSnapshot"];
	        this.inputSummary = source["inputSummary"];
	        this.schemaVersion = source["schemaVersion"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateInfo {
	    success: boolean;
	    hasUpdate: boolean;
	    currentVersion: string;
	    latestVersion?: string;
	    releaseName?: string;
	    releaseUrl?: string;
	    releaseNotes?: string;
	    publishedAt?: string;
	    asset?: DownloadAsset;
	    platform: string;
	    message?: string;
	    error?: string;
	    platformHasAsset: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.hasUpdate = source["hasUpdate"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseName = source["releaseName"];
	        this.releaseUrl = source["releaseUrl"];
	        this.releaseNotes = source["releaseNotes"];
	        this.publishedAt = source["publishedAt"];
	        this.asset = this.convertValues(source["asset"], DownloadAsset);
	        this.platform = source["platform"];
	        this.message = source["message"];
	        this.error = source["error"];
	        this.platformHasAsset = source["platformHasAsset"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

