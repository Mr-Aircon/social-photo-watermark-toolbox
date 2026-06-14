/**
 * 大家方便使用的工具箱 - 图像处理中心
 * 核心逻辑层基准配置（全面支持小红书 3:4 黄金画幅）
 */
const PREVIEW_WIDTH = 500;

// 初始化视口 Canvas 对象实例
const canvas = new fabric.Canvas('mainCanvas', {
    preserveObjectStacking: true
});

// --- 🛠️ UI/UX 规范层：配置高阶工业级操控框线条样式 ---
fabric.Object.prototype.set({
    borderColor: '#136163',       // 激活对象的边框线映射主色
    cornerColor: '#ffffff',       // 纯白方形圆点
    cornerStrokeColor: '#1a1a1a', // 细墨黑色包边，强化白底图上的可识别度
    cornerStyle: 'rect',          // 纯粹的四角硬朗方块（直角化设计）
    cornerSize: 8,                // 轻量化点控手柄尺寸
    transparentCorners: false,    // 实心方块
    lineWidth: 1.5                // 纤细精致线宽
});

// 解析与绑定 DOM 节点
const bgInput = document.getElementById('bgInput');
const wmInput = document.getElementById('wmInput');
const sizeSelect = document.getElementById('sizeSelect');
const opacitySlider = document.getElementById('opacitySlider');
const opacityValue = document.getElementById('opacityValue');
const positionSelect = document.getElementById('positionSelect');
const downloadBtn = document.getElementById('downloadBtn');

let bgLayer = null;
let wmLayer = null;

// ✨ 完美对齐 HTML 默认值：初始化即锁定小红书高清规格尺寸
let targetWidth = 1242;   
let targetHeight = 1656; 

/**
 * 响应式重算画布比例因子及视口渲染尺寸
 */
function updateCanvasSize() {
    const size = sizeSelect.value;
    
    // ✨ 注入小红书（3:4）画幅比矩阵映射分支
    if (size === '3:4') { targetWidth = 1242; targetHeight = 1656; }
    else if (size === '1:1') { targetWidth = 1080; targetHeight = 1080; }
    else if (size === '4:5') { targetWidth = 1080; targetHeight = 1350; }
    else if (size === '16:9') { targetWidth = 1920; targetHeight = 1080; }

    // 动态计算预览缩放倍率
    const scaleFactor = PREVIEW_WIDTH / targetWidth;
    const previewHeight = targetHeight * scaleFactor;

    // 动态同步物理视口大小
    canvas.setDimensions({ width: PREVIEW_WIDTH, height: previewHeight });
    canvas.setZoom(scaleFactor);
    canvas.renderAll();
}

sizeSelect.addEventListener('change', () => {
    updateCanvasSize();
    // 如果切换比例时原图/水印已经存在，让图层强制重新对齐并刷新控制框，防止图层飞到画布边缘之外
    if (bgLayer) {
        bgLayer.scaleToWidth(targetWidth);
        bgLayer.setCoords();
    }
    if (wmLayer) wmLayer.setCoords();
    canvas.renderAll();
});
updateCanvasSize(); // 初始化生命周期触发

/**
 * 基础底图导入与图层下沉渲染逻辑
 */
bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const imgObj = new Image();
        imgObj.onload = function () {
            if (bgLayer) canvas.remove(bgLayer);

            bgLayer = new fabric.Image(imgObj, {
                left: 0,
                top: 0,
                hasRotatingPoint: false 
            });

            bgLayer.scaleToWidth(targetWidth);
            canvas.add(bgLayer);
            canvas.sendToBack(bgLayer);
            canvas.setActiveObject(bgLayer);
            
            // ✨ 核心技术修复：图层载入时强行触发坐标系同步重算，解决画面初始化不渲染或滞后的Bug
            bgLayer.setCoords();
            updateCanvasSize();
            canvas.renderAll();
        };
        imgObj.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

/**
 * 水印资产层导入与前置激活逻辑
 */
wmInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const imgObj = new Image();
        imgObj.onload = function () {
            if (wmLayer) canvas.remove(wmLayer);

            wmLayer = new fabric.Image(imgObj, {
                opacity: parseFloat(opacitySlider.value)
            });

            // 水印默认分配 25% 比例宽敞度
            wmLayer.scaleToWidth(targetWidth * 0.25);
            
            // 默认锚定中央
            wmLayer.set({
                left: (targetWidth - wmLayer.getScaledWidth()) / 2,
                top: (targetHeight - wmLayer.getScaledHeight()) / 2
            });

            canvas.add(wmLayer);
            canvas.bringToFront(wmLayer);
            canvas.setActiveObject(wmLayer);
            
            // ✨ 核心技术修复：导入水印资产同步更新物理边界坐标
            wmLayer.setCoords();
            canvas.renderAll();
        };
        imgObj.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

/**
 * 水印位置对齐矩阵变换
 */
positionSelect.addEventListener('change', () => {
    if (!wmLayer) return;
    const pos = positionSelect.value;
    if (!pos) return;
    
    const padding = 60; // 遵循 8 像素栅格的相对边距
    const wmWidth = wmLayer.getScaledWidth();
    const wmHeight = wmLayer.getScaledHeight();

    if (pos === 'bottom-right') {
        wmLayer.set({ left: targetWidth - wmWidth - padding, top: targetHeight - wmHeight - padding });
    } else if (pos === 'center') {
        wmLayer.set({ left: (targetWidth - wmWidth) / 2, top: (targetHeight - wmHeight) / 2 });
    } else if (pos === 'top-left') {
        wmLayer.set({ left: padding, top: padding });
    }
    
    wmLayer.setCoords();
    canvas.renderAll();
});

/**
 * 图层不透明度通道控制
 */
opacitySlider.addEventListener('input', () => {
    const val = parseFloat(opacitySlider.value);
    opacityValue.innerText = val.toFixed(1);
    if (wmLayer) {
        wmLayer.set('opacity', val);
        canvas.renderAll();
    }
});

/**
 * 高清大图像素级资产渲染下载导出
 */
downloadBtn.addEventListener('click', () => {
    if (!bgLayer) {
        alert('错误：未检测到基础底层图片，请先上传原始图像。');
        return;
    }
    // 抹除激活对象的辅助定位边界线线框
    canvas.discardActiveObject().renderAll();
    const exportMultiplier = targetWidth / PREVIEW_WIDTH;

    const dataURL = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.95,
        multiplier: exportMultiplier
    });
    
    const link = document.createElement('a');
    link.download = `toolbox_output_${Date.now()}.jpg`;
    link.href = dataURL;
    link.click();
});