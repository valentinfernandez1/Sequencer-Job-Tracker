export type AlertData = {
    jobAddress: string,
    jobId: number,
    args: string,
    network: string
    blockNumber?: number,
}

export async function emitAlert(data: AlertData){
    console.log("A job has been worked")
    console.log(data)
}

