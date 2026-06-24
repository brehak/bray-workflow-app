<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Workflow extends Model
{
    protected $fillable = [
        'name',
        'description',
        'nodes',
        'edges',
        'tags',
        'folder',
    ];

    protected $casts = [
        'nodes' => 'array',
        'edges' => 'array',
        'tags'  => 'array',
    ];
} 