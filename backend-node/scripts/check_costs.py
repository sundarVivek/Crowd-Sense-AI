import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce', region_name='us-east-1')

# Cost Explorer requires YYYY-MM-DD
# Start from 1st of current month to tomorrow
today = datetime.utcnow()
start_date = today.replace(day=1).strftime('%Y-%m-%d')
end_date = (today + timedelta(days=1)).strftime('%Y-%m-%d')

print(f"Querying AWS Cost Explorer from {start_date} to {end_date}...")

try:
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': start_date,
            'End': end_date
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {
                'Type': 'DIMENSION',
                'Key': 'SERVICE'
            }
        ]
    )

    total_cost = 0.0
    services = []
    
    for result in response.get('ResultsByTime', []):
        for group in result.get('Groups', []):
            service_name = group['Keys'][0]
            amount = float(group['Metrics']['UnblendedCost']['Amount'])
            unit = group['Metrics']['UnblendedCost']['Unit']
            if amount > 0.0:
                services.append((service_name, amount, unit))
                total_cost += amount

    print("\n==========================================")
    print(f"💰 MONTH-TO-DATE TOTAL COST: ${total_cost:.4f} USD")
    print("==========================================")
    
    if services:
        print("\nBreakdown by Service:")
        for s_name, amt, u in sorted(services, key=lambda x: x[1], reverse=True):
            print(f" - {s_name}: ${amt:.4f} {u}")
    else:
        print("\nAll active services are currently at $0.00 (100% covered by AWS Free Tier)!")

except Exception as e:
    print("Cost Explorer Notice:", str(e))
