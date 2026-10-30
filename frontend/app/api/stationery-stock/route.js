export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const branch_id = searchParams.get('branch_id') || searchParams.get('branch') || 'ahmedabad';
  return new Response(JSON.stringify({
    success: true,
    data: [],
    branch_id: branch_id,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { 
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}
