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

}

