# Contract Expiration Quick Guide

## For Admins: How to Use the Auto-Release System

### Creating a New Season

#### Season Start (e.g., 10.0, 11.0)
```
1. Go to Admin > Seasons
2. Enter Season Number: 10 (whole number)
3. Click "Create Season"
4. ✅ System automatically releases contracts expiring at ≤ 10.0
5. Success message shows: "Created Season 10 | 🔓 Auto-released X contracts"
```

#### Mid-Season (e.g., 10.5, 11.5)
```
1. Go to Admin > Seasons
2. Enter Season Number: 10.5 (with .5 decimal)
3. Click "Create Season"
4. ✅ System automatically releases contracts expiring at ≤ 10.5
5. Success message shows: "Created Season 10.5 | 🔓 Auto-released X contracts"
```

### What Happens Automatically

**When you create a new season:**
1. 🔍 System scans all active contracts
2. 📊 Identifies contracts where `expire_season <= new_season_number`
3. 🔓 Marks those contracts as `inactive`
4. 👤 Players become FREE AGENTS immediately
5. 📝 Logs transaction for each club
6. ✅ Carries over only non-expired contracts

### Contract Expiration Examples

| Contract Expires At | New Season Created | Result |
|---------------------|-------------------|--------|
| SEASON 10           | 10.0              | ✅ Released (FREE AGENT) |
| SEASON 9.5          | 10.0              | ✅ Released (FREE AGENT) |
| SEASON 10.5         | 10.0              | ❌ Not Released (Still with club) |
| SEASON 10.5         | 10.5              | ✅ Released (FREE AGENT) |
| SEASON 11           | 10.5              | ❌ Not Released (Still with club) |

### Checking Released Players

**Method 1: Free Agents List**
```
Admin > Auction > View Free Agents tab
- All released players appear here
```

**Method 2: Transaction Logs**
```
Admin > Financial Ops > Wallet Transactions
- Filter by transaction type: "contract_expiry"
- Shows which players were auto-released
```

### Important Notes

⚠️ **No Manual Release Needed** - Contracts auto-expire during season creation

⚠️ **Mid-Season Timing** - Use .5 (e.g., 10.5) for mid-season releases

⚠️ **Carryover Required** - Enable "Carry Over" option to transfer active contracts

⚠️ **Cannot Be Undone** - Released players become free agents permanently

### Troubleshooting

**Q: Players not showing as free agents after season creation?**
- Check if "Carry Over" was enabled during season creation
- Verify the contract expire_season is ≤ new season number
- Check transaction logs for "contract_expiry" entries

**Q: Too many/few players released?**
- Verify season number entered correctly (10.0 vs 10.5)
- Check contract expire_season format in database
- Review the auto-release summary in success message

**Q: Want to preview before releasing?**
- Use Admin > Auction > Window tab
- Click "Preview Expired Contracts"
- Shows which contracts would expire (but don't need to manually release anymore)

### Best Practices

✅ **Review contracts before season creation** - Check expiring contracts list first

✅ **Create mid-season carefully** - Use .5 for mid-season points

✅ **Document released players** - Keep a record of auto-release summaries

✅ **Communicate with managers** - Let them know when their contracts expire

✅ **Test in non-production first** - Try with a test season if unsure
