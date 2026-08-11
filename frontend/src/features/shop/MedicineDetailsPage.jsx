import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShieldAlert, ShoppingCart, Upload, Package } from 'lucide-react'
import api from '@/lib/api'
import { useCartStore } from '@/stores/cartStore'
import PublicNavbar from '@/components/shared/PublicNavbar'
import PublicFooter from '@/components/shared/PublicFooter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function MedicineDetailsPage(){
  const { id }=useParams();const navigate=useNavigate();const addItem=useCartStore(s=>s.addItem);const [quantity,setQuantity]=useState(1)
  const {data,isLoading,isError}=useQuery({queryKey:['medicine',id],queryFn:()=>api.get(`/inventory/medicines/${id}`).then(r=>r.data.data)})
  const unavailable=data?.availabilityStatus==='UNAVAILABLE';const rx=data?.classification==='PRESCRIPTION_REQUIRED';const restricted=data?.classification==='RESTRICTED'
  const act=()=>{if(rx){navigate(`/medicines/${data.id}/prescription`);return}addItem(data,quantity);navigate('/cart')}
  return <div className="min-h-screen bg-muted/20"><PublicNavbar/><main className="content-shell pb-20 pt-24">
    <Link to="/medicines" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/>Back to medicines</Link>
    {isLoading?<Skeleton className="mt-8 h-[520px] rounded-3xl"/>:isError?<Card className="mt-8"><CardContent className="p-10 text-center">Medicine could not be loaded.</CardContent></Card>:<div className="mt-8 grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
      <div className="flex min-h-[380px] items-center justify-center rounded-3xl border bg-gradient-to-br from-primary/15 via-muted to-background">{data.imageUrl?<img src={data.imageUrl} alt={data.name} className="max-h-[420px] w-full object-contain"/>:<Package className="h-28 w-28 text-primary/50"/>}</div>
      <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-wrap gap-2"><Badge>{data.classification?.replaceAll('_',' ')}</Badge><Badge variant="outline">{data.availabilityStatus?.replaceAll('_',' ')}</Badge></div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{data.name}</h1><p className="mt-2 text-lg text-muted-foreground">{data.genericName}{data.strength&&` · ${data.strength}`}{data.dosageForm&&` · ${data.dosageForm}`}</p>
        <p className="mt-6 leading-7 text-muted-foreground">{data.description||'Approved product information is not currently available. Contact the pharmacy for information.'}</p>
        <dl className="mt-7 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-5 text-sm"><div><dt className="text-muted-foreground">Manufacturer</dt><dd className="mt-1 font-medium">{data.manufacturer||'Not listed'}</dd></div><div><dt className="text-muted-foreground">Category</dt><dd className="mt-1 font-medium">{data.categoryName||'Uncategorized'}</dd></div><div><dt className="text-muted-foreground">Pack size</dt><dd className="mt-1 font-medium">{data.packSize||'Ask pharmacy'}</dd></div><div><dt className="text-muted-foreground">Selling unit</dt><dd className="mt-1 font-medium">{data.sellingUnit}</dd></div></dl>
        <div className="mt-7 rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">Price per {data.sellingUnit}</p><p className="mt-1 text-3xl font-bold">RWF {Number(data.price).toLocaleString()}</p>{data.packSize&&<p className="mt-1 text-sm text-muted-foreground">Per {data.sellingUnit} of {data.packSize}</p>}
          {!restricted&&!unavailable&&<div className="mt-5 flex flex-wrap gap-3">{!rx&&<div className="inline-flex items-center rounded-lg border"><button aria-label="Decrease quantity" onClick={()=>setQuantity(Math.max(1,quantity-1))} className="p-2"><Minus className="h-4 w-4"/></button><span className="w-10 text-center">{quantity}</span><button aria-label="Increase quantity" onClick={()=>setQuantity(Math.min(99,quantity+1))} className="p-2"><Plus className="h-4 w-4"/></button></div>}<Button onClick={act}>{rx?<><Upload className="mr-2 h-4 w-4"/>Upload prescription</>:<><ShoppingCart className="mr-2 h-4 w-4"/>Add to cart</>}</Button></div>}
          {(restricted||unavailable)&&<Button className="mt-5" variant="outline" disabled={unavailable} onClick={()=>navigate('/contact')}>{unavailable?'Unavailable':'Contact pharmacy'}</Button>}
        </div>
        {(data.generalWarnings||data.storageConditions)&&<div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5 text-amber-500"/>General information</h2>{data.generalWarnings&&<p className="mt-2 text-sm text-muted-foreground">{data.generalWarnings}</p>}{data.storageConditions&&<p className="mt-2 text-sm"><b>Storage:</b> {data.storageConditions}</p>}</div>}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Product information is general and is not a diagnosis, personalized dose, or substitute for advice from a qualified healthcare professional.</p>
      </div></div>}
  </main><PublicFooter/></div>
}
