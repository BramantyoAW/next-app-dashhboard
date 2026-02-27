export const DEFAULT_EMAIL_WRAPPER = (content: string) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
        <img src="{{logo_url}}" alt="omBot Logo" style="height: 48px; width: auto;">
    </div>
    <div style="padding: 40px 32px; color: #334155; line-height: 1.7; background-color: #ffffff;">
        ${content}
    </div>
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-weight: 600; color: #64748b;">omBot Indonesia</p>
        <p style="margin: 4px 0 0;">Solusi Cerdas untuk Pertumbuhan UMKM</p>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px;">
            Email ini dikirim secara otomatis oleh sistem omBot. <br/>
            © ${new Date().getFullYear()} OmBot. All rights reserved.
        </div>
    </div>
</div>
`;

export const DEFAULT_TEMPLATES = {
  email_template_registration_pending: `
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; letter-spacing: -0.02em;">Halo {{owner_name}},</h2>
    <p style="font-size: 16px;">Terima kasih telah bergabung dengan <strong>omBot</strong>! Pendaftaran bisnis Anda untuk <strong>{{merchant_name}}</strong> telah kami terima.</p>
    
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; color: #92400e; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600; font-size: 15px;">Status: Menunggu Persetujuan</p>
        <p style="margin: 4px 0 0; font-size: 14px;">Tim administrator kami sedang melakukan verifikasi data bisnis Anda. Proses ini biasanya memakan waktu maksimal 1x24 jam.</p>
    </div>
    
    <p style="font-size: 15px; color: #475569;">Kami akan segera mengirimkan email konfirmasi setelah akun Anda aktif dan siap digunakan.</p>
    <p style="margin-top: 32px; font-size: 15px;">Salam hangat,<br/><strong style="color: #0f172a;">Tim omBot</strong></p>
  `,
  
  email_template_registration_approved: `
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; letter-spacing: -0.02em;">Selamat, {{owner_name}}!</h2>
    <p style="font-size: 16px;">Kabar gembira! Akun Bisnis <strong>{{merchant_name}}</strong> Anda telah <strong>DISETUJUI</strong> dan kini telah aktif.</p>
    
    <p style="font-size: 15px; color: #475569;">Anda sudah dapat mulai melakukan pengaturan toko, mengelola produk, dan mencatat transaksi penjualan Anda melalui dashboard omBot.</p>
    
    <div style="text-align: center; margin: 40px 0;">
        <a href="{{login_url}}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Masuk ke Dashboard</a>
    </div>
    
    <p style="font-size: 15px; color: #475569;">Jika Anda membutuhkan bantuan dalam penggunaan aplikasi, jangan ragu untuk menghubungi tim support kami.</p>
    <p style="margin-top: 32px; font-size: 15px;">Selamat berjualan!<br/><strong style="color: #0f172a;">Tim omBot</strong></p>
  `,
  
  email_template_report_general: `
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; letter-spacing: -0.01em;">Laporan Operasional: {{merchant_name}}</h2>
    <p style="font-size: 16px;">Berikut adalah ringkasan laporan transaksi dan stok bisnis Anda untuk periode yang berakhir pada <strong>{{date}}</strong>.</p>
    
    <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
            Detail rincian laporan per item, grafik penjualan, serta analisis margin dapat Anda akses secara lengkap melalui menu <strong>Laporan</strong> di dashboard admin.
        </p>
    </div>
    
    <p style="font-size: 15px; color: #475569;">Gunakan data laporan ini untuk membantu Anda mengambil keputusan bisnis yang lebih tepat dan terukur.</p>
    <p style="margin-top: 32px; font-size: 15px;">Terima kasih,<br/><strong style="color: #0f172a;">Sistem omBot</strong></p>
  `,
  
  email_template_account_suspended: `
    <h2 style="color: #0f172a; margin-top: 0; font-size: 24px; letter-spacing: -0.02em;">Pemberitahuan Akun: {{owner_name}}</h2>
    <p style="font-size: 16px;">Kami menginformasikan bahwa akun Bisnis <strong>{{merchant_name}}</strong> Anda saat ini telah <strong>DITANGGUHKAN / DIBLOKIR</strong> oleh administrator.</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; color: #991b1b; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600; font-size: 15px;">Akses Dibatasi</p>
        <p style="margin: 4px 0 0; font-size: 14px;">Anda tidak dapat mengakses dashboard atau melakukan transaksi selama akun dalam status ini.</p>
    </div>
    
    <p style="font-size: 15px; color: #475569;">Jika menurut Anda ini adalah kesalahan, silakan hubungi tim support kami untuk melakukan klarifikasi.</p>
    <p style="margin-top: 32px; font-size: 15px;">Terima kasih,<br/><strong style="color: #0f172a;">Tim Support omBot</strong></p>
  `,
};
