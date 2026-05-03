document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics script loaded');

    // Handle button group active state
    const timeButtons = document.querySelectorAll('.bg-light.rounded-pill.border .btn');
    timeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active classes from all buttons
            timeButtons.forEach(btn => {
                btn.classList.remove('btn-primary', 'shadow-sm');
                btn.classList.add('btn-light', 'text-secondary');
            });
            
            // Add active class to clicked button
            button.classList.remove('btn-light', 'text-secondary');
            button.classList.add('btn-primary', 'shadow-sm');
            
            // Here you would typically fetch new data based on the selected time range
            console.log(`Selected time range: ${button.textContent}`);
        });
    });

    // Handle export button
    const actionButtons = document.querySelectorAll('.d-flex.gap-3 > .btn');
    actionButtons.forEach(btn => {
        if (btn.textContent.includes('Xuất Excel')) {
            btn.addEventListener('click', () => {
                alert('Đang tải xuống dữ liệu báo cáo...');
            });
        }
        if (btn.textContent.includes('Tuỳ chọn')) {
            btn.addEventListener('click', () => {
                console.log('Open date range picker');
            });
        }
    });
});
