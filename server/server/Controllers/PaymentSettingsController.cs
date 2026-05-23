using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Modal;

namespace server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaymentSettingsController : ControllerBase
    {
        private readonly serverContext _context;

        public PaymentSettingsController(serverContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<PaymentSettingDto>> GetPaymentSettings()
        {
            var setting = await _context.PaymentSetting
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (setting == null)
            {
                return Ok(new PaymentSettingDto());
            }

            return Ok(MapToDto(setting));
        }

        [HttpPut]
        public async Task<ActionResult<PaymentSettingDto>> UpdatePaymentSettings(PaymentSettingDto dto)
        {
            var setting = await _context.PaymentSetting.FirstOrDefaultAsync();

            if (setting == null)
            {
                setting = new PaymentSetting
                {
                    BankId = dto.BankId,
                    AccountNumber = dto.AccountNumber,
                    AccountName = dto.AccountName,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.PaymentSetting.Add(setting);
            }
            else
            {
                setting.BankId = dto.BankId;
                setting.AccountNumber = dto.AccountNumber;
                setting.AccountName = dto.AccountName;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(MapToDto(setting));
        }

        private static PaymentSettingDto MapToDto(PaymentSetting setting)
        {
            return new PaymentSettingDto
            {
                BankId = setting.BankId,
                AccountNumber = setting.AccountNumber,
                AccountName = setting.AccountName,
                QrCodeUrl = !string.IsNullOrEmpty(setting.BankId) && !string.IsNullOrEmpty(setting.AccountNumber)
                    ? $"https://img.vietqr.io/image/{setting.BankId}-{setting.AccountNumber}-compact2.png?accountName={Uri.EscapeDataString(setting.AccountName ?? "")}"
                    : null
            };
        }
    }

    public class PaymentSettingDto
    {
        public string? BankId { get; set; }
        public string? AccountNumber { get; set; }
        public string? AccountName { get; set; }
        public string? QrCodeUrl { get; set; }
    }
}
