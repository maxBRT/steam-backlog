<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_a_successful_response()
    {
        $this->markTestSkipped('Requires Vite build. Will be replaced by real tests as features are implemented.');

        $response = $this->get(route('home'));

        $response->assertOk();
    }
}
