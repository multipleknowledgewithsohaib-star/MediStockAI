(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,55486,e=>{"use strict";let t=(0,e.i(22904).default)("loader-circle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);e.s(["Loader2",()=>t],55486)},62280,e=>{"use strict";let t=(0,e.i(22904).default)("trash-2",[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]]);e.s(["Trash2",()=>t],62280)},7567,e=>{"use strict";let t=(0,e.i(22904).default)("check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);e.s(["Check",()=>t],7567)},51822,54106,e=>{"use strict";let t=(0,e.i(22904).default)("printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);e.s(["Printer",()=>t],51822),e.s(["printInvoice",0,(e,t)=>{let a=window.open("","_blank","width=400,height=600");if(!a)return;let s=e.items.reduce((e,t)=>e+Number(t.price)*Number(t.quantity),0),r=e.discount||0,i=new Date,l=`
        <html>
            <head>
                <title>Print Invoice</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 72mm; /* Standard thermal width active area */
                        margin: 0;
                        padding: 2mm;
                        font-size: 11px;
                        line-height: 1.1;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 3px 0; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .item-details { font-size: 9px; margin-left: 5px; }
                    .totals-box { border: 1px solid #000; padding: 4px; margin: 8px 0; }
                    @media print {
                        @page { 
                            size: 80mm auto; 
                            margin: 0; 
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header text-center">
                    <h1>MediStock</h1>
                    <div>SHAHRAH-E-PAKISTAN, KARACHI</div>
                    <div>UAN: 021 111 246 246</div>
                    <br/>
                    <div class="bold">Original Receipt</div>
                </div>

                <div class="divider"></div>

                <div class="item-row">
                    <span>Receipt # ${e.id.toString().padStart(8,"0")}</span>
                    <span>Pos: POS-101</span>
                </div>
                <div class="item-row">
                    <span>Date: ${i.toLocaleDateString()}</span>
                    <span>Time: ${i.toLocaleTimeString()}</span>
                </div>
                <div>User: ${t||"ADMIN CORE"}</div>
                <div>Customer: WALK-IN CUSTOMER</div>

                <div class="divider"></div>
                <div class="bold">Pack Unit     Gross  DisAmt  Item Total</div>
                <div class="divider"></div>

                ${e.items.map(e=>`
                    <div class="bold">${e.name.toUpperCase()}</div>
                    <div class="item-row">
                        <span class="item-details">${e.qtyDisplay||`${e.quantity.toString().padStart(2,"0")}  00`}</span>
                        <span>${(Number(e.price)*Number(e.quantity)).toFixed(2)}</span>
                    </div>
                `).join("")}

                <div class="divider"></div>
                <div class="item-row bold">
                    <span>Total</span>
                    <span>${e.items.length} items</span>
                    <span>${e.total.toFixed(0)}</span>
                </div>
                
                <div class="text-center" style="font-size: 10px; margin-top:5px;">
                    Total Gross    Total Discount    Total Net<br/>
                    <span class="bold">${s.toFixed(0)}            ${r.toFixed(0)}            ${e.total.toFixed(0)}</span>
                </div>

                <div class="totals-box">
                    <div class="item-row" style="align-items: center;">
                        <span style="font-size: 10px;">Invoice Value</span>
                        <span style="font-size: 20px;" class="bold">${e.total.toLocaleString()}</span>
                    </div>
                </div>

                <div class="text-center bold">Mode Of Payment</div>
                <div class="divider"></div>
                <div class="item-row">
                    <span>CASH</span>
                    <span>${e.total.toFixed(2)}</span>
                </div>
                <div class="item-row bold">
                    <span>Total Payment :</span>
                    <span>${e.total.toFixed(2)}</span>
                </div>

                <div class="divider"></div>
                <div class="item-row">
                    <span>CashReceived:</span>
                    <span>${(e.paidAmount||0).toFixed(0)}</span>
                </div>
                <div class="item-row">
                    <span>CashRefund:</span>
                    <span>${(e.changeAmount||0).toFixed(0)}</span>
                </div>

                <div class="divider"></div>
                <div class="text-center bold" style="font-size: 10px;">CUSTOMER RESPONSIBILITY</div>
                <div class="text-center" style="font-size: 9px;">
                    *Please Check Your Medicine By Prescription &<br/>
                    Expiry Date Of Medicine Yourself, Or Through<br/>
                    Your Medical Consultant<br/>
                    *In Case Of Any Doubt Of Wrong Medicine, It<br/>
                    May Be Returned<br/>
                    *Please Match Your Purchased Items With The<br/>
                    Bill. In Case Of Any Discrepancy, Call Our<br/>
                    Helpline Or Whatsapp Us On The Number Below.
                </div>

                <div style="margin-top: 10px;" class="text-center bold">
                    For Complaints, Please<br/>
                    <span style="font-size: 14px;">WhatsApp 0302-8647611</span>
                </div>

                <div style="margin-top: 10px;" class="text-center bold">
                    THANKYOU & COME AGAIN
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 100);
                    };
                </script>
            </body>
        </html>
    `;a.document.write(l),a.document.close()}],54106)},55581,e=>{"use strict";var t=e.i(19807),a=e.i(24280),s=e.i(6756),r=e.i(62280),i=e.i(51822),l=e.i(97215),n=e.i(7567),d=e.i(92406),c=e.i(55486),o=e.i(83933),x=e.i(54106),p=e.i(98811);function m(){let[e,m]=(0,a.useState)(null);(0,a.useEffect)(()=>{let e=localStorage.getItem("user");e?m(JSON.parse(e)):m({name:"Demo User"})},[]);let[h,g]=(0,a.useState)(""),[b,f]=(0,a.useState)([]),[v,y]=(0,a.useState)(!1),[N,j]=(0,a.useState)(!1),[w,P]=(0,a.useState)(0),[k,I]=(0,a.useState)(0),{data:S,loading:C}=(0,o.useData)("/api/products"),{data:M,refetch:T}=(0,o.useData)("/api/sales"),A=S?.filter(e=>e.name.toLowerCase().includes(h.toLowerCase()))||[],q=(e,t,a,s)=>{f(r=>{let i=r.find(t=>t.productId===e);if(!i)return r;let l=i.stripsPerBox,n=i.tabletsPerStrip,d=(isNaN(t)?0:Math.max(0,t))*l*n+(isNaN(a)?0:Math.max(0,a))*n+(isNaN(s)?0:Math.max(0,s));if(d<=0)return r.filter(t=>t.productId!==e);let c=Math.min(d,(i.stock||0)*(i.unitsPerPack||1));return r.map(t=>t.productId===e?{...t,quantity:c}:t)})},R=b.reduce((e,t)=>e+Math.floor(t.quantity/t.unitsPerPack)*(t.discount||0),0),$=Math.round(100*b.reduce((e,t)=>e+(void 0!==t.manualPrice?t.manualPrice:t.pricePerUnit)*t.quantity,0))/100,O=Math.max(0,$+0-R-w),D=k>O?k-O:0,F=async()=>{0===b.length||N||(j(!0),setTimeout(async()=>{let t=p.storage.get("activeBranch",null),a=t?.id,s={id:Date.now(),invoiceNo:`INV-${Date.now().toString().slice(-6)}`,date:new Date().toISOString(),branchId:a,total:O,discount:R+w,paidAmount:k,changeAmount:D,items:b.map(e=>({productId:e.productId,name:e.name,quantity:e.quantity,pricePerUnit:void 0!==e.manualPrice?e.manualPrice:e.pricePerUnit,boxPrice:e.boxPrice,unitsPerPack:e.unitsPerPack,discount:e.discount,batch:e.batch,batchId:e.batchId})),soldBy:e?.name||"ADMIN CORE"};(0,x.printInvoice)({id:s.id,total:s.total,discount:s.discount,paidAmount:s.paidAmount,changeAmount:s.changeAmount,items:s.items.map(e=>{e.stripsPerBox;let t=e.tabletsPerStrip||1,a=e.unitsPerPack||1,s=Math.floor(e.quantity/a),r=e.quantity%a,i=Math.floor(r/t),l=r%t,n=[];return s>0&&n.push(`${s} Box`),i>0&&n.push(`${i} Strip`),l>0&&n.push(`${l} Tablet`),{name:e.name+(e.quantity%a!=0?" (Loose)":""),quantity:e.quantity,price:e.pricePerUnit,qtyDisplay:n.join(" + ")||"0 Unit"}})},e?.name||"ADMIN CORE");let r=p.storage.get("sales",[]);p.storage.set("sales",[s,...r]);let i=p.storage.get("batches",[]).map(e=>{let t=b.find(t=>t.productId===e.productId&&e.branchId==a);if(t){let a=t.quantity/(t.unitsPerPack||1);return{...e,quantity:Math.max(0,e.quantity-a)}}return e});p.storage.set("batches",i);let l=p.storage.get("products",[]).map(e=>{let t=b.find(t=>t.productId===e.id);if(t&&e.batches){let s=t.quantity/(e.unitsPerPack||1),r=e.batches.find(e=>e.branchId==a);r&&(r.quantity=Math.max(0,r.quantity-s));let i=e.batches.reduce((e,t)=>e+(t.quantity||0),0);return{...e,stock:i}}return e});p.storage.set("products",l),f([]),P(0),I(0),y(!0),setTimeout(()=>y(!1),3e3),T(),j(!1),window.dispatchEvent(new Event("jailwatch_storage_change"))},1e3))};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:"flex flex-col gap-8 animate-fade-in-up",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h1",{className:"text-3xl font-bold text-white uppercase",children:"Point of Sale"}),(0,t.jsx)("p",{className:"text-white/70 mt-1 italic",children:"Create new sales and manage billing."})]}),(0,t.jsx)("div",{className:"flex items-center gap-3",children:(0,t.jsxs)("span",{className:"text-sm text-gray-500",children:["Today's Total: ",(0,t.jsxs)("strong",{className:"text-green-600",children:["PKR ",$.toLocaleString()]})]})})]}),(0,t.jsxs)("div",{className:"grid gap-6 lg:grid-cols-3",children:[(0,t.jsxs)("div",{className:"lg:col-span-2 space-y-4",children:[(0,t.jsxs)("div",{className:"relative",children:[(0,t.jsx)(s.Search,{className:"absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"}),(0,t.jsx)("input",{type:"text",placeholder:"Search medicine to add...",value:h,onChange:e=>g(e.target.value),className:"h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"})]}),C?(0,t.jsx)("div",{className:"flex justify-center py-12",children:(0,t.jsx)(c.Loader2,{className:"h-8 w-8 text-purple-600 animate-spin"})}):(0,t.jsx)("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:A.map(e=>(0,t.jsxs)("button",{onClick:()=>(e=>{let t=b.find(t=>t.productId===e.id),a=Math.max(1,Number(e.stripsPerBox)||1),s=Math.max(1,Number(e.tabletsPerStrip)||1),r=a*s,i=(Number(e.stock)||0)*r;if(t){if(t.quantity+s>i)return;f(b.map(t=>t.productId===e.id?{...t,quantity:Math.min(i,t.quantity+s)}:t))}else{if(i<=0)return;f([...b,{productId:e.id,name:e.name,quantity:i>=s?s:i,pricePerUnit:e.salePrice/r,boxPrice:e.salePrice,unitsPerPack:r,stripsPerBox:a,tabletsPerStrip:s,discount:Number(e.defaultDiscount)||0,batch:e.batches?.[0]?.batchNo||"N/A",batchId:e.batches?.[0]?.id,stock:e.stock}])}})(e),disabled:e.stock<=0,className:`card-premium rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform ${e.stock<=0?"opacity-60 cursor-not-allowed":""}`,children:[(0,t.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[(0,t.jsx)("div",{className:"w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center",children:(0,t.jsx)(d.Pill,{className:"h-5 w-5 text-purple-600"})}),(0,t.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,t.jsx)("p",{className:"font-medium text-gray-900 truncate",children:e.name}),(0,t.jsxs)("p",{className:`text-xs ${e.stock<=10?"text-red-500 font-medium":"text-gray-500"}`,children:["Stock: ",e.stock]})]})]}),(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsxs)("div",{className:"flex flex-col",children:[(0,t.jsx)("span",{className:"text-[10px] font-black text-gray-400 uppercase tracking-tighter",children:"Box Price"}),(0,t.jsxs)("span",{className:"text-lg font-black text-purple-600 leading-none",children:["PKR ",Number(e.salePrice).toFixed(2)]})]}),(0,t.jsxs)("div",{className:"flex flex-col text-right",children:[(0,t.jsx)("span",{className:"text-[10px] font-black text-gray-400 uppercase tracking-tighter",children:"Per Tablet"}),(0,t.jsxs)("span",{className:"text-sm font-black text-blue-600 leading-none",children:["PKR ",(e.salePrice/(e.unitsPerPack||1)).toFixed(2)]})]})]})]},e.id))}),(0,t.jsxs)("div",{className:"card-premium rounded-2xl p-6 mt-6",children:[(0,t.jsx)("h3",{className:"text-lg font-semibold text-gray-900 mb-4",children:"Recent Sales"}),(0,t.jsx)("div",{className:"space-y-3",children:M?.slice(0,5).map(e=>(0,t.jsxs)("div",{className:"flex items-center justify-between p-3 rounded-xl bg-gray-50/80",children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:"w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center",children:(0,t.jsx)(n.Check,{className:"h-5 w-5 text-green-600"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-medium text-gray-900",children:e.invoiceNo}),(0,t.jsx)("p",{className:"text-xs text-gray-500",children:new Date(e.date).toLocaleString()})]})]}),(0,t.jsxs)("div",{className:"text-right",children:[(0,t.jsxs)("p",{className:"font-semibold text-gray-900",children:["PKR ",e.total.toLocaleString()]}),(0,t.jsxs)("p",{className:"text-xs text-gray-500",children:[e.items?.length," items"]})]})]},e.id))})]})]}),(0,t.jsxs)("div",{className:"card-premium rounded-2xl p-6 h-fit sticky top-24",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between mb-6",children:[(0,t.jsx)("h3",{className:"text-lg font-semibold text-gray-900",children:"Current Bill"}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)(l.ShoppingCart,{className:"h-5 w-5 text-purple-600"}),(0,t.jsxs)("span",{className:"badge badge-info",children:[b.length," items"]})]})]}),0===b.length?(0,t.jsxs)("div",{className:"text-center py-12",children:[(0,t.jsx)(l.ShoppingCart,{className:"h-12 w-12 text-gray-300 mx-auto mb-3"}),(0,t.jsx)("p",{className:"text-gray-500",children:"Cart is empty"}),(0,t.jsx)("p",{className:"text-sm text-gray-400",children:"Add medicines to create a sale"})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{className:"space-y-3 max-h-[300px] overflow-y-auto mb-6",children:b.map(e=>{let a=e.stripsPerBox||1,s=e.tabletsPerStrip||1,i=e.unitsPerPack||1,l=Math.floor(e.quantity/i),n=e.quantity%i,d=Math.floor(n/s),c=n%s;return(0,t.jsxs)("div",{className:"flex flex-col gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm transition-all hover:bg-white hover:shadow-md",children:[(0,t.jsxs)("div",{className:"flex items-start justify-between",children:[(0,t.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,t.jsx)("p",{className:"font-bold text-gray-900 text-sm truncate",children:e.name}),(0,t.jsxs)("div",{className:"flex flex-col gap-1 mt-1",children:[(0,t.jsxs)("span",{className:"text-[9px] font-black text-purple-600 uppercase tracking-tight",children:["Box: ",e.boxPrice.toFixed(0)," | Strip: ",(e.boxPrice/a).toFixed(1)," | Tab: ",e.pricePerUnit.toFixed(2)]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"text-[9px] font-bold text-gray-400 uppercase leading-none",children:"Price Override (Per Tab):"}),(0,t.jsx)("input",{type:"number",value:e.manualPrice??"",placeholder:e.pricePerUnit.toFixed(2),onChange:t=>{var a,s;return a=e.productId,s=parseFloat(t.target.value),void f(e=>e.map(e=>e.productId===a?{...e,manualPrice:s}:e))},className:"w-16 h-5 text-[9px] font-black border border-gray-100 rounded bg-white px-1 focus:ring-1 focus:ring-purple-500"})]})]})]}),(0,t.jsx)("button",{onClick:()=>{var t;return t=e.productId,void f(e=>e.filter(e=>e.productId!==t))},className:"w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm",children:(0,t.jsx)(r.Trash2,{className:"h-4 w-4"})})]}),(0,t.jsxs)("div",{className:"grid grid-cols-3 gap-2",children:[(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsx)("label",{className:"text-[9px] font-black text-gray-400 uppercase block text-center",children:"Boxes"}),(0,t.jsxs)("div",{className:"flex h-9 items-stretch bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",children:[(0,t.jsx)("button",{onClick:()=>q(e.productId,l-1,d,c),className:"px-2 bg-gray-50 text-gray-400 border-r",children:"-"}),(0,t.jsx)("input",{type:"text",inputMode:"numeric",value:l,onChange:t=>q(e.productId,parseInt(t.target.value)||0,d,c),className:"w-full text-center font-black text-gray-900 border-none bg-transparent text-xs p-0"}),(0,t.jsx)("button",{onClick:()=>q(e.productId,l+1,d,c),className:"px-2 bg-gray-50 text-gray-400 border-l",children:"+"})]})]}),(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsx)("label",{className:"text-[9px] font-black text-gray-500 uppercase block text-center",children:"Strips"}),(0,t.jsxs)("div",{className:"flex h-9 items-stretch bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",children:[(0,t.jsx)("button",{onClick:()=>q(e.productId,l,d-1,c),className:"px-2 bg-gray-50 text-gray-400 border-r",children:"-"}),(0,t.jsx)("input",{type:"text",inputMode:"numeric",value:d,onChange:t=>q(e.productId,l,parseInt(t.target.value)||0,c),className:"w-full text-center font-black text-gray-900 border-none bg-transparent text-xs p-0"}),(0,t.jsx)("button",{onClick:()=>q(e.productId,l,d+1,c),className:"px-2 bg-gray-50 text-gray-400 border-l",children:"+"})]})]}),(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsx)("label",{className:"text-[9px] font-black text-blue-500 uppercase block text-center",children:"Tablets"}),(0,t.jsxs)("div",{className:"flex h-9 items-stretch bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",children:[(0,t.jsx)("button",{onClick:()=>q(e.productId,l,d,c-1),className:"px-2 bg-gray-50 text-gray-400 border-r",children:"-"}),(0,t.jsx)("input",{type:"text",inputMode:"numeric",value:c,onChange:t=>q(e.productId,l,d,parseInt(t.target.value)||0),className:"w-full text-center font-black text-gray-900 border-none bg-transparent text-xs p-0"}),(0,t.jsx)("button",{onClick:()=>q(e.productId,l,d,c+1),className:"px-2 bg-gray-50 text-gray-400 border-l",children:"+"})]})]})]}),(0,t.jsxs)("div",{className:"pt-2 flex items-center justify-between",children:[(0,t.jsx)("div",{className:"flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide",children:[1,2,5,10].map(a=>(0,t.jsxs)("button",{onClick:()=>q(e.productId,l,d,a),className:"flex-shrink-0 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-bold text-gray-500 hover:text-purple-600 transition-all",children:[a," T"]},a))}),(0,t.jsxs)("div",{className:"text-right pl-3",children:[(0,t.jsx)("p",{className:"text-[9px] font-black text-purple-400 uppercase tracking-tighter leading-none mb-1",children:"Subtotal"}),(0,t.jsxs)("p",{className:"text-sm font-black text-purple-600 leading-none",children:["PKR ",(e.pricePerUnit*e.quantity).toFixed(0)]})]})]})]},e.productId)})}),(0,t.jsxs)("div",{className:"border-t border-gray-100 pt-4 space-y-2",children:[(0,t.jsxs)("div",{className:"flex justify-between text-sm",children:[(0,t.jsx)("span",{className:"text-gray-500",children:"Subtotal"}),(0,t.jsxs)("span",{className:"text-gray-900",children:["PKR ",$.toLocaleString()]})]}),(0,t.jsxs)("div",{className:"pt-2 space-y-3",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("label",{className:"text-xs font-bold text-gray-500 uppercase tracking-widest",children:"Discount (PKR)"}),(0,t.jsx)("input",{type:"number",value:w,onChange:e=>P(Number(e.target.value)),className:"w-24 h-8 rounded-lg border border-gray-200 px-3 text-right text-sm font-bold focus:ring-2 focus:ring-purple-500/20"})]}),(0,t.jsxs)("div",{className:"flex items-center justify-between border-t border-gray-100 pt-3",children:[(0,t.jsx)("span",{className:"text-lg font-black text-gray-900",children:"Total"}),(0,t.jsxs)("span",{className:"text-2xl font-black text-purple-600",children:["PKR ",O.toLocaleString()]})]})]}),(0,t.jsxs)("div",{className:"bg-gray-50 rounded-2xl p-4 space-y-3 mt-4",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("label",{className:"text-xs font-black text-gray-500 uppercase tracking-widest",children:"Cash Received"}),(0,t.jsx)("input",{type:"number",placeholder:"Enter cash amount",value:k||"",onChange:e=>I(Number(e.target.value)),className:"w-32 h-10 rounded-xl border border-gray-200 px-4 text-right text-base font-black text-green-600 focus:ring-4 focus:ring-green-500/10"})]}),(0,t.jsxs)("div",{className:"flex items-center justify-between border-t border-dashed border-gray-200 pt-3",children:[(0,t.jsx)("label",{className:"text-xs font-black text-gray-400 uppercase tracking-widest",children:"Change Return"}),(0,t.jsxs)("span",{className:"text-xl font-black text-orange-600",children:["PKR ",D.toLocaleString()]})]})]})]}),(0,t.jsxs)("div",{className:"flex gap-3 mt-6",children:[(0,t.jsx)("button",{onClick:()=>f([]),className:"flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors",children:"Clear"}),(0,t.jsxs)("button",{onClick:F,disabled:N,className:"flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2",children:[N?(0,t.jsx)(c.Loader2,{className:"h-4 w-4 animate-spin"}):(0,t.jsx)(i.Printer,{className:"h-4 w-4"}),"Complete Sale"]})]})]})]})]})]}),(0,t.jsx)(u,{showSuccess:v,total:O})]})}function u({showSuccess:e,total:a}){return(0,t.jsx)(t.Fragment,{children:e&&(0,t.jsx)("div",{className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4",children:(0,t.jsxs)("div",{className:"bg-white rounded-2xl p-8 text-center animate-fade-in-up shadow-2xl",children:[(0,t.jsx)("div",{className:"w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4",children:(0,t.jsx)(n.Check,{className:"h-8 w-8 text-green-600"})}),(0,t.jsx)("h3",{className:"text-xl font-bold text-gray-900 mb-2",children:"Sale Complete!"}),(0,t.jsx)("p",{className:"text-gray-500",children:"Invoice has been generated"}),(0,t.jsxs)("p",{className:"text-2xl font-bold text-purple-600 mt-4",children:["PKR ",a.toLocaleString()]})]})})})}e.s(["default",()=>m])}]);