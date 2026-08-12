const asyncHandler = (requestfn)=>{
    return (req,res,next)=>{
        Promise.resolve(requestfn(req,res,next)).catch((err)=> next(err))
    
    }
}