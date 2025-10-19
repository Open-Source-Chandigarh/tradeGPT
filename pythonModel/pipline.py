import yfinance as yf
import pandas as pd
import numpy as np
from nsepython import nse_optionchain_scrapper
from datetime import datetime, timedelta
import time
import json
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
import os


def clean_column_names(df):
    new_cols = []
    for col in df.columns:
        if '_' in col:
            base = col.split('_')[0]
            new_cols.append(base)
        else:
            new_cols.append(col)
    df.columns = new_cols
    return df


def fetch_stock_data(ticker, period, interval):
    data = yf.download(tickers=ticker, period=period, interval=interval)
    data = data.reset_index()
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = ['_'.join(filter(None, col)).strip() for col in data.columns]
    data = clean_column_names(data)
    if 'Date' in data.columns:
        data.rename(columns={'Date': 'Datetime'}, inplace=True)
    elif 'Datetime' not in data.columns:
        data.rename(columns={data.columns[0]: 'Datetime'}, inplace=True)
    data = data.set_index('Datetime').asfreq('h')
    for col in ['Open', 'High', 'Low', 'Close']:
        if col in data.columns:
            data[col] = data[col].ffill()
    if 'Volume' in data.columns:
        data['Volume'] = data['Volume'].fillna(0)
    data.reset_index(inplace=True)
    return data


def fetch_options_data(symbol, days_to_fetch):
    all_data = []
    for i in range(days_to_fetch):
        date = datetime.now() - timedelta(days=i)
        if date.weekday() >= 5:  # Skip weekends
            continue
        try:
            opt_data = nse_optionchain_scrapper(symbol)
            records = opt_data['records']['data']
            for rec in records:
                ce = rec.get('CE', {})
                pe = rec.get('PE', {})
                all_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'strikePrice': rec['strikePrice'],
                    'CE_openInterest': ce.get('openInterest', 0),
                    'CE_changeinOpenInterest': ce.get('changeinOpenInterest', 0),
                    'CE_volume': ce.get('totalTradedVolume', 0),
                    'CE_ltp': ce.get('lastPrice', 0),
                    'PE_openInterest': pe.get('openInterest', 0),
                    'PE_changeinOpenInterest': pe.get('changeinOpenInterest', 0),
                    'PE_volume': pe.get('totalTradedVolume', 0),
                    'PE_ltp': pe.get('lastPrice', 0)
                })
        except Exception:
            pass
        time.sleep(2)
    options_df = pd.DataFrame(all_data)
    options_df['date'] = pd.to_datetime(options_df['date'], errors='coerce')
    return options_df


def clean_and_merge(stock_df, options_df):
    if 'Datetime' not in stock_df.columns:
        possible = [col for col in stock_df.columns if 'datetime' in col.lower()]
        if possible:
            stock_df.rename(columns={possible[0]: 'Datetime'}, inplace=True)
        else:
            stock_df.rename(columns={stock_df.columns[0]: 'Datetime'}, inplace=True)
    stock_df['Datetime'] = pd.to_datetime(stock_df['Datetime'], errors='coerce')
    stock_df.dropna(subset=['Datetime'], inplace=True)
    for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
        if col in stock_df.columns:
            stock_df[col] = pd.to_numeric(stock_df[col], errors='coerce').ffill().fillna(0)
    stock_df['Return'] = stock_df['Close'].pct_change().fillna(0)
    stock_df['MA_5'] = stock_df['Close'].rolling(5).mean().fillna(method='bfill')
    stock_df['MA_10'] = stock_df['Close'].rolling(10).mean().fillna(method='bfill')
    stock_df['Volatility'] = stock_df['Return'].rolling(5).std().fillna(0)

    for col in ['CE_openInterest','PE_openInterest','CE_changeinOpenInterest','PE_changeinOpenInterest','CE_volume','PE_volume']:
        if col in options_df.columns:
            options_df[col] = pd.to_numeric(options_df[col], errors='coerce').fillna(0)

    options_agg = options_df.groupby('date').agg({
        'CE_openInterest': 'sum',
        'PE_openInterest': 'sum',
        'CE_changeinOpenInterest': 'sum',
        'PE_changeinOpenInterest': 'sum',
        'CE_volume': 'sum',
        'PE_volume': 'sum',
    }).reset_index()
    options_agg['PCR'] = options_agg['PE_openInterest'] / (options_agg['CE_openInterest'] + 1e-6)

    stock_df['date'] = stock_df['Datetime'].dt.date
    options_agg['date_only'] = options_agg['date'].dt.date
    merged = pd.merge(stock_df, options_agg, left_on='date', right_on='date_only', how='left').fillna(0)

    merged['hour'] = merged['Datetime'].dt.hour
    merged['day'] = merged['Datetime'].dt.day
    merged['weekday'] = merged['Datetime'].dt.weekday

    return merged


def train_and_predict(merged_df, sequence_length=10, epochs=30, use_transfer_learning=True):
    """
    Train LSTM model with optional transfer learning.
    
    If base weights exist, loads them and fine-tunes (5 epochs).
    Otherwise, trains from scratch (30 epochs).
    """
    
    features = [
        'Open','High','Low','Close','Volume','MA_5','MA_10','Volatility',
        'CE_openInterest','PE_openInterest','CE_changeinOpenInterest','PE_changeinOpenInterest',
        'CE_volume','PE_volume','PCR','hour','day','weekday'
    ]
    targets = [
        'Close','Return','Volatility','CE_openInterest','PE_openInterest',
        'CE_changeinOpenInterest','PE_changeinOpenInterest','PCR'
    ]
    
    df = merged_df.copy()
    df.fillna(0, inplace=True)
    X = df[features].values
    y = df[targets].values
    
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y)
    
    X_seq, y_seq = [], []
    for i in range(len(X_scaled) - sequence_length):
        X_seq.append(X_scaled[i:i+sequence_length])
        y_seq.append(y_scaled[i+sequence_length])
    X_seq = np.array(X_seq)
    y_seq = np.array(y_seq)
    
    # Build model architecture
    inputs = Input(shape=(X_seq.shape[1], X_seq.shape[2]), name='input')
    x = LSTM(128, return_sequences=True, name='lstm_1')(inputs)
    x = LSTM(64, name='lstm_2')(x)
    x = Dropout(0.2, name='dropout_1')(x)
    outputs = Dense(y_seq.shape[1], activation='linear', name='dense_output')(x)
    
    model = Model(inputs, outputs)
    
    # =================== TRANSFER LEARNING ===================
    base_weights_path = 'models/base_stock_weights.weights.h5'
    
    if use_transfer_learning and os.path.exists(base_weights_path):
        try:
            print("\n" + "="*60)
            print("🔄 TRANSFER LEARNING ENABLED")
            print("="*60)
            print("📥 Loading pre-trained base model weights...")
            
            # Load pre-trained weights (by_name matches layer names)
            try:
                # Try Keras 3.x method (no by_name parameter)
                model.load_weights(base_weights_path, skip_mismatch=True)
            except TypeError:
                # Fallback for Keras 2.x
                model.load_weights(base_weights_path, by_name=True, skip_mismatch=True)
                print("✅ Base weights loaded successfully!")
            
            # Freeze LSTM layers to preserve learned patterns
            model.get_layer('lstm_1').trainable = False
            model.get_layer('lstm_2').trainable = False
            print("✅ Frozen LSTM layers (keeping general market patterns)")
            
            # Count trainable layers
            trainable_count = sum([1 for layer in model.layers if layer.trainable])
            print(f"✅ Training only {trainable_count} layers: Dropout + Dense")
            
            # Reduce epochs for fine-tuning
            epochs = 5
            print(f"✅ Reduced training epochs: {epochs} (instead of 30)")
            print("="*60 + "\n")
            
            print("⚡ Expected training time: 15-30 seconds (10x faster!)\n")
            
        except Exception as e:
            print(f"\n⚠️  Could not load base weights: {e}")
            print("⚠️  Falling back to training from scratch...\n")
            # Make all layers trainable again
            for layer in model.layers:
                layer.trainable = True
    else:
        if not os.path.exists(base_weights_path):
            print("\n" + "="*60)
            print("ℹ️  BASE WEIGHTS NOT FOUND")
            print("="*60)
            print(f"📁 Looking for: {base_weights_path}")
            print("💡 To enable transfer learning (10x speedup):")
            print("   1. Run: python Train_Base_Model.py")
            print("   2. Wait ~15 minutes (one-time setup)")
            print("   3. Enjoy 15-30 second predictions forever!")
            print("="*60 + "\n")
        
        print("🔨 Training from scratch (this will take 2-5 minutes)...\n")
    # =========================================================
    
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
    
    model.fit(
        X_seq, y_seq,
        epochs=epochs,
        batch_size=32,
        validation_split=0.1,
        shuffle=False,
        verbose=1
    )
    
    # Unfreeze all layers for prediction (if any were frozen)
    for layer in model.layers:
        layer.trainable = True
    
    y_pred_scaled = model.predict(X_seq)
    y_pred = scaler_y.inverse_transform(y_pred_scaled)
    pred_df = pd.DataFrame(y_pred, columns=targets)
    
    return pred_df


def summarize_predictions(pred_df):
    summary_features = {}
    for col in pred_df.columns:
        summary_features[f'{col}_mean'] = float(pred_df[col].mean())
        summary_features[f'{col}_std'] = float(pred_df[col].std())
        summary_features[f'{col}_min'] = float(pred_df[col].min())
        summary_features[f'{col}_max'] = float(pred_df[col].max())
        summary_features[f'{col}_last'] = float(pred_df[col].iloc[-1])
        summary_features[f'{col}_delta'] = float(pred_df[col].iloc[-1] - pred_df[col].iloc[0])
    return summary_features


def main_pipeline(ticker, symbol, period, interval, days_to_fetch):
    stock_df = fetch_stock_data(ticker=ticker, period=period, interval=interval)
    options_df = fetch_options_data(symbol=symbol, days_to_fetch=days_to_fetch)
    merged_df = clean_and_merge(stock_df, options_df)
    pred_df = train_and_predict(merged_df)
    summary_dict = summarize_predictions(pred_df)
    return json.dumps(summary_dict, indent=4)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 6:
        print("Error: Missing required arguments. Usage:")
        print("python script.py <ticker> <symbol> <period> <interval> <days_to_fetch>")
        sys.exit(1) 

    ticker = sys.argv[1]
    symbol = sys.argv[2]
    period = sys.argv[3]
    interval = sys.argv[4]
    try:
        days_to_fetch = int(sys.argv[5])
    except ValueError:
        print("Error: days_to_fetch must be an integer.")
        sys.exit(1)

    json_summary = main_pipeline(ticker, symbol, period, interval, days_to_fetch)
    print(json_summary)
