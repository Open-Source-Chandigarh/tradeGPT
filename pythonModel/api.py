from fastapi import FastAPI, Query, HTTPException
from pipline import main_pipeline
import json

app = FastAPI()

@app.get("/predict")
def predict(
    ticker: str = Query(..., description="Ticker symbol, e.g. 'ADANIENT.NS'"),
    symbol: str = Query(..., description="Stock symbol, e.g. 'ADANIENT'"),
    period: str = Query(..., description="Data period for stock, e.g. '2mo'"),
    interval: str = Query(..., description="Data interval for stock, e.g. '1h'"),
    days_to_fetch: int = Query(..., ge=1, description="Number of days to fetch options data"),
):
    try:
        result = main_pipeline(
            ticker=ticker,
            symbol=symbol,
            days_to_fetch=days_to_fetch,
            period=period,
            interval=interval
        )

        # Handle different possible return types
        if isinstance(result, dict):
            return result
        elif isinstance(result, str):
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                return {"result": result}
        elif hasattr(result, "to_dict"):  # pandas DataFrame
            return result.to_dict(orient="records")
        else:
            return {"result": str(result)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run with:
# uvicorn api:app --reload
