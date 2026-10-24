import boto3

try:
    ft = boto3.client('freetier', region_name='us-east-1')
    res = ft.get_free_tier_usage()
    usages = res.get('freeTierUsages', [])
    print(f"Total Free Tier Usages tracked: {len(usages)}")
    for u in usages:
        actual = u.get('actualUsageAmount', 0)
        limit = u.get('limitAmount', 0)
        if actual > 0:
            print(f" - {u.get('service')}: {actual:.4f} / {limit:.4f} {u.get('unit')} ({u.get('description')})")
except Exception as e:
    print("FreeTier API notice:", e)
