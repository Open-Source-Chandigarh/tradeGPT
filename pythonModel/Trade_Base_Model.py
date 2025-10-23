import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
import os
from datetime import datetime


def train_base_model():

    BASE_STOCKS = [
        "TCS.NS", "INFY.NS", "WIPRO.NS",
        "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS",
        "RELIANCE.NS", "ITC.NS", "HINDUNILVR.NS"
    ]

    print(f"Fetching data for {len(BASE_STOCKS)} stocks...")
    all_data = []

    for stock in BASE_STOCKS:
        try:
            print(f"Dowloading {stock}...", end=" ")
        
            data = yf.download(
                stock, 
                period="6mo", 
                interval="1h", 
                progress=False,
                auto_adjust=False 
            )

            if not data.empty:
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
            
                data = data.reset_index()
                data['stock'] = stock
                all_data.append(data)
                print(f"✓ ({len(data)} rows)")
            else:
                print("✗ No Data")

        except Exception as e:
            print(f"✗ Error: {e}")

    if len(all_data) == 0:
        print("\n❌ Failed to download any stock data. Check internet connection.")
        return None

    print(f"\n📊 Combining data from {len(all_data)} stocks...")
    combined = pd.concat(all_data, ignore_index=True)
    print(f"✓ Total rows: {len(combined)}")

    print("\n🔧 Engineering features...")
    combined['Return'] = combined['Close'].pct_change(fill_method=None).fillna(0)
    combined['MA_5'] = combined['Close'].rolling(5).mean().bfill()
    combined['MA_10'] = combined['Close'].rolling(10).mean().bfill()
    combined['Volatility'] = combined['Return'].rolling(5).std().fillna(0)
    combined['hour'] = combined['Datetime'].dt.hour
    combined['day'] = combined['Datetime'].dt.day
    combined['weekday'] = combined['Datetime'].dt.weekday

    combined = combined.dropna()
    print(f"✓ Clean rows after feature engineering: {len(combined)}")

    base_label = [
        'Open', 'High', 'Low', 'Close', 'Volume',
        'MA_5', 'MA_10', 'Volatility', 'Return',
        'hour', 'day', 'weekday'
    ]

    base_predictor_label = ['Close', 'Return', 'Volatility']

    X = combined[base_label].values  
    y = combined[base_predictor_label].values  

    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y) 

    sequence_length = 10
    X_seq, y_seq = [], []

    for i in range(len(X_scaled) - sequence_length):
        X_seq.append(X_scaled[i:i+sequence_length])
        y_seq.append(y_scaled[i+sequence_length])

    X_seq = np.array(X_seq)
    y_seq = np.array(y_seq)

    
    inputs = Input(shape=(sequence_length, len(base_label)), name='input')

    x = LSTM(124, return_sequences=True, name='lstm_1')(inputs)
    x = LSTM(64, name='lstm_2')(x)
    x = Dropout(0.2, name='dropout_1')(x)

    outputs = Dense(len(base_predictor_label), activation='linear', name='dense_output')(x)

    base_model = Model(inputs, outputs)
    
    base_model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')

    base_model.summary()

    history = base_model.fit(
        X_seq, y_seq,
        epochs=50,
        batch_size=64,
        validation_split=0.2,
        verbose=1
    )

    return base_model


if __name__ == "__main__":
    train_base_model()
