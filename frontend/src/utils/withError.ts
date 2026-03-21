class HttpError extends Error {
    public readonly status: number;
    public readonly body: any;

    constructor(message: string, status: number, body?: any) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.body = body;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpError);
        }
    }
}

export async function withError<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    const response = await fn();
  
    if (response instanceof Response && !response.ok) {
        let errorBody: any = {};
        try {
            errorBody = await response.json();
        } catch {
            errorBody = { message: response.statusText };
        } 
        
        throw new HttpError(
            errorBody.error || errorBody.message || response.statusText,
            response.status,
            errorBody
        );
    }
  
    return response;
  }
