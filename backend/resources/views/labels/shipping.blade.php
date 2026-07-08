<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 10pt; background: #fff; }

  .page {
    width: 288pt;
    height: 432pt;
    padding: 12pt;
    border: 1pt solid #ccc;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5pt solid #000;
    padding-bottom: 6pt;
    margin-bottom: 8pt;
  }
  .brand { font-size: 13pt; font-weight: bold; letter-spacing: 0.5pt; }
  .brand-sub { font-size: 7pt; color: #555; }
  .order-number { font-size: 9pt; text-align: right; }
  .order-number strong { font-size: 11pt; display: block; }

  .section { margin-bottom: 7pt; }
  .label-title {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    color: #777;
    margin-bottom: 2pt;
  }
  .address-block { font-size: 9.5pt; line-height: 1.4; }
  .address-block .name { font-weight: bold; font-size: 10.5pt; }

  .divider { border-top: 0.5pt dashed #aaa; margin: 6pt 0; }

  .items-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  .items-table th { text-align: left; font-size: 7pt; text-transform: uppercase; color: #777; padding: 0 0 2pt 0; border-bottom: 0.5pt solid #ccc; }
  .items-table td { padding: 1.5pt 0; vertical-align: top; }
  .items-table td:last-child { text-align: right; }

  .totals { font-size: 8.5pt; margin-top: 6pt; }
  .totals tr td { padding: 1pt 0; }
  .totals tr td:last-child { text-align: right; font-weight: bold; }
  .total-row td { font-size: 10pt; font-weight: bold; border-top: 0.5pt solid #000; padding-top: 3pt; }

  .footer {
    position: absolute;
    bottom: 8pt;
    left: 12pt;
    right: 12pt;
    border-top: 0.5pt solid #ccc;
    padding-top: 4pt;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #666;
  }

  .barcode-row {
    text-align: center;
    margin: 6pt 0;
    font-size: 8pt;
    font-family: "Courier New", monospace;
    letter-spacing: 2pt;
    border: 0.5pt solid #ddd;
    padding: 4pt;
    background: #f9f9f9;
  }
</style>
</head>
<body>

@foreach ($orders as $order)
@php
  $addr = $order->shipping_address;
  $placed = $order->placed_at?->format('d M Y') ?? '—';
  $itemCount = $order->items->sum('quantity');
@endphp

<div class="page">

  <div class="header">
    <div>
      <div class="brand">Shree Krishna Collection</div>
      <div class="brand-sub">Unstitched Fabric Specialists</div>
    </div>
    <div class="order-number">
      <span>Order</span>
      <strong>#{{ $order->order_number }}</strong>
      <div style="font-size:8pt;color:#555;">{{ $placed }}</div>
    </div>
  </div>

  {{-- Ship to --}}
  <div class="section">
    <div class="label-title">Ship To</div>
    <div class="address-block">
      <div class="name">{{ $addr['name'] ?? '—' }}</div>
      @if (!empty($addr['phone']))
        <div>{{ $addr['phone'] }}</div>
      @endif
      <div>{{ $addr['line1'] ?? '' }}@if (!empty($addr['line2'])), {{ $addr['line2'] }}@endif</div>
      <div>{{ $addr['city'] ?? '' }}, {{ $addr['state'] ?? '' }} – {{ $addr['pincode'] ?? '' }}</div>
      <div>{{ $addr['country'] ?? 'IN' }}</div>
    </div>
  </div>

  <div class="divider"></div>

  {{-- Items --}}
  <div class="section">
    <div class="label-title">Items ({{ $itemCount }} pcs)</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Length</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        @foreach ($order->items as $item)
        <tr>
          <td style="width:45%;">{{ \Illuminate\Support\Str::limit($item->product_name, 28) }}</td>
          <td>{{ number_format($item->length_metres, 1) }}m</td>
          <td>{{ $item->quantity }}</td>
          <td>₹{{ number_format($item->line_total_paise / 100, 2) }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  <div class="divider"></div>

  {{-- Totals --}}
  <table class="totals" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="color:#555;">Subtotal</td>
      <td style="text-align:right;">₹{{ number_format($order->subtotal_paise / 100, 2) }}</td>
    </tr>
    @if ($order->discount_paise > 0)
    <tr>
      <td style="color:#555;">Discount</td>
      <td style="text-align:right;color:#c00;">−₹{{ number_format($order->discount_paise / 100, 2) }}</td>
    </tr>
    @endif
    <tr>
      <td style="color:#555;">Shipping</td>
      <td style="text-align:right;">{{ $order->shipping_paise > 0 ? '₹'.number_format($order->shipping_paise/100,2) : 'Free' }}</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td style="text-align:right;">₹{{ number_format($order->total_paise / 100, 2) }}</td>
    </tr>
  </table>

  <div class="divider"></div>

  {{-- Barcode stand-in (order number as text barcode) --}}
  <div class="barcode-row">
    <div style="font-size:6pt;color:#777;letter-spacing:1pt;margin-bottom:2pt;">SCAN / ORDER REF</div>
    <div style="font-size:11pt;letter-spacing:3pt;">{{ $order->order_number }}</div>
  </div>

  <div class="footer">
    <span>{{ config('app.name', 'SKC') }}</span>
    <span>Payment: {{ ucfirst($order->payment_status?->value ?? 'pending') }}</span>
    <span>{{ now()->format('d M Y') }}</span>
  </div>

</div>
@endforeach

</body>
</html>
